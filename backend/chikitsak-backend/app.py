"""
app.py — Digital Chikitsak Flask Backend
All data stored in Supabase. No MySQL dependency.
Flask handles: JWT auth, AI endpoints, Cloudinary uploads, hospital GeoJSON.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import uuid, requests, os, json, datetime
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import re, jwt, logging
from supabase_client import get_supabase
from hospital_data import find_nearby_hospitals

load_dotenv()

# ── logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

LMSTUDIO_URL = os.getenv("LMSTUDIO_URL", "http://127.0.0.1:1234/v1/chat/completions")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "qwen3")
JWT_SECRET    = os.getenv("JWT_SECRET", "dev-secret-change")
JWT_ALG       = "HS256"

if JWT_SECRET == "dev-secret-change":
    logger.warning("⚠️  JWT_SECRET is using the default insecure value. Set JWT_SECRET in your .env file!")

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=False)

limiter = Limiter(
    get_remote_address, app=app,
    default_limits=["1000 per day", "200 per hour"],
    storage_uri="memory://"
)

# ── helpers ──────────────────────────────────────────────────────────────────

TAG_PATTERNS = [
    (r"<think>.*?</think>", re.IGNORECASE | re.DOTALL),
    (r"</?answer>", re.IGNORECASE),
    (r"</?final(?:_answer)?>", re.IGNORECASE),
    (r"</?reasoning>", re.IGNORECASE),
    (r"<\|.*?\|>", 0),
    (r"<[^>\n]{1,60}>", 0),
]

def clean_text(text):
    if not isinstance(text, str):
        return ""
    for patt, flags in TAG_PATTERNS:
        text = re.sub(patt, "", text, flags=flags)
    return text.strip()

def inject_plaintext(messages):
    instruction = (
        "Respond in plain text only. Do NOT include XML-like tags such as "
        "<think>, <Answer>, <final>. Provide the final answer only."
    )
    if messages and messages[0].get("role") == "system":
        messages[0]["content"] = f'{messages[0]["content"]}\n\n{instruction}'.strip()
    else:
        messages.insert(0, {"role": "system", "content": instruction})
    return messages

def create_token(payload: dict) -> str:
    to_encode = {
        **payload,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
        "iat": datetime.datetime.now(datetime.timezone.utc),
    }
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALG)

def require_auth(fn):
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "missing bearer token"}), 401
        try:
            user = jwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=[JWT_ALG])
        except Exception:
            return jsonify({"error": "invalid token"}), 401
        request.user = user
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper

def sb():
    """Shorthand for Supabase client."""
    return get_supabase()

def safe_query(query):
    """Execute a Supabase query and raise on error. Returns res.data."""
    res = query.execute()
    if hasattr(res, "error") and res.error:
        logger.error(f"Supabase query error: {res.error}")
        raise Exception(str(res.error))
    return res.data

def get_self_patient(phone):
    """Return the 'Self' app_patient row for this account, create if missing."""
    try:
        rows = safe_query(
            sb().table("app_patients").select("*").eq("account_phone", phone).eq("relation", "Self").limit(1)
        )
        if rows:
            return rows[0]
        # auto-create — look up name first
        acc = sb().table("accounts").select("name").eq("phone", phone).maybe_single().execute()
        if hasattr(acc, "error") and acc.error:
            logger.error(f"get_self_patient account lookup error: {acc.error}")
            return None
        name = acc.data["name"] if acc.data else phone
        new = sb().table("app_patients").insert({
            "account_phone": phone, "name": name, "relation": "Self", "patient_phone": phone
        }).execute()
        if hasattr(new, "error") and new.error:
            logger.error(f"get_self_patient insert error: {new.error}")
            return None
        return new.data[0] if new.data else None
    except Exception as e:
        logger.error(f"get_self_patient exception: {e}")
        return None

# ── auth ─────────────────────────────────────────────────────────────────────

@app.route("/api/register", methods=["POST"])
@limiter.limit("10 per hour")
def register():
    data = request.json or {}
    phone = data.get("phone")
    pin   = data.get("pin") or data.get("password")
    name  = data.get("name")
    role  = data.get("role", "patient")
    if not phone or not pin or not name:
        return jsonify({"error": "phone, pin and name required"}), 400
    if not re.match(r"^[6-9]\d{9}$", phone):
        return jsonify({"error": "Invalid phone number"}), 400
    # check duplicate
    try:
        existing = safe_query(sb().table("accounts").select("phone").eq("phone", phone))
    except Exception as e:
        logger.error(f"Register duplicate check error: {e}")
        return jsonify({"error": "Database error, please try again"}), 500
    if existing:
        return jsonify({"error": "Phone number already registered"}), 409
    hashed = generate_password_hash(pin)
    try:
        safe_query(sb().table("accounts").insert({"phone": phone, "pin_hash": hashed, "name": name, "role": role}))
    except Exception as e:
        logger.error(f"Register insert error: {e}")
        return jsonify({"error": "Failed to create account"}), 500
    # create self patient row
    if role == "patient":
        try:
            safe_query(sb().table("app_patients").insert({
                "account_phone": phone, "name": name, "relation": "Self", "patient_phone": phone
            }))
        except Exception as e:
            logger.warning(f"Register self-patient creation failed: {e}")
    logger.info(f"New registration: phone={phone}, role={role}")
    user  = {"phone": phone, "name": name, "role": role}
    token = create_token(user)
    return jsonify({"token": token, "user": user})

@app.route("/api/login", methods=["POST"])
@limiter.limit("20 per minute")
def login():
    data = request.json or {}
    phone = data.get("phone")
    pin   = data.get("pin") or data.get("password")
    if not phone or not pin:
        return jsonify({"error": "phone and pin required"}), 400
    if not re.match(r"^[6-9]\d{9}$", phone):
        return jsonify({"error": "Invalid phone number"}), 400
    logger.info(f"Login attempt for phone={phone}")
    try:
        res = sb().table("accounts").select("*").eq("phone", phone).limit(1).execute()
    except Exception as e:
        logger.error(f"Login DB error: {e}")
        return jsonify({"error": "Database error, please try again"}), 500
    if hasattr(res, "error") and res.error:
        logger.error(f"Login query error: {res.error}")
        return jsonify({"error": "Database error, please try again"}), 500
    if not res.data or not check_password_hash(res.data[0]["pin_hash"], pin):
        logger.warning(f"Failed login attempt for phone={phone}")
        return jsonify({"error": "invalid credentials"}), 401
    row  = res.data[0]
    user = {"phone": row["phone"], "name": row["name"], "role": row["role"]}
    # ensure self patient exists
    if user["role"] == "patient":
        get_self_patient(phone)
    logger.info(f"Successful login for phone={phone}, role={user['role']}")
    token = create_token(user)
    return jsonify({"token": token, "user": user})

# ── utility ───────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True})

# ── reminders ─────────────────────────────────────────────────────────────────

@app.route("/api/reminders", methods=["GET"])
@require_auth
def get_reminders():
    phone = request.user["phone"]
    res = sb().table("medication_reminders").select("*").eq("patient_phone", phone).order("created_at", desc=True).execute()
    return jsonify(res.data or [])

@app.route("/api/reminders", methods=["POST"])
@require_auth
def create_reminder():
    data = request.json or {}
    data["patient_phone"] = request.user["phone"]
    res = sb().table("medication_reminders").insert(data).execute()
    return jsonify(res.data[0] if res.data else {}), 201

@app.route("/api/reminders/<reminder_id>", methods=["PUT"])
@require_auth
def update_reminder(reminder_id):
    data = request.json or {}
    res = sb().table("medication_reminders").update(data).eq("id", reminder_id).eq("patient_phone", request.user["phone"]).execute()
    return jsonify(res.data[0] if res.data else {})

@app.route("/api/reminders/<reminder_id>", methods=["DELETE"])
@require_auth
def delete_reminder(reminder_id):
    sb().table("medication_reminders").delete().eq("id", reminder_id).eq("patient_phone", request.user["phone"]).execute()
    return jsonify({"ok": True})

# ── patients / family ─────────────────────────────────────────────────────────


@app.route("/api/patients", methods=["GET"])
@require_auth
def list_patients():
    user = request.user
    try:
        if user.get("role") == "patient":
            rows = safe_query(sb().table("app_patients").select("*").eq("account_phone", user["phone"]))
            if not rows:
                p = get_self_patient(user["phone"])
                rows = [p] if p else []
        else:
            phone = request.args.get("phone")
            if phone:
                rows = safe_query(sb().table("app_patients").select("*").eq("account_phone", phone))
            else:
                rows = safe_query(sb().table("app_patients").select("*").limit(100))
    except Exception as e:
        logger.error(f"list_patients error: {e}")
        return jsonify({"error": "Failed to fetch patients"}), 500
    return jsonify(rows)

@app.route("/api/patients", methods=["POST"])
@require_auth
def add_patient():
    user = request.user
    if user.get("role") != "patient":
        return jsonify({"error": "only patient accounts can add family"}), 403
    data = request.json or {}
    if not data.get("name"):
        return jsonify({"error": "name required"}), 400
    payload = {
        "account_phone":       user["phone"],
        "name":                data.get("name"),
        "age":                 data.get("age"),
        "gender":              data.get("gender"),
        "blood_group":         data.get("blood_group"),
        "medical_history":     data.get("medical_history", ""),
        "current_medications": data.get("current_medications", ""),
        "relation":            data.get("relation", ""),
        "patient_phone":       data.get("phone", ""),
        "profile_image":       data.get("profile_image", ""),
    }
    try:
        rows = safe_query(sb().table("app_patients").insert(payload))
    except Exception as e:
        logger.error(f"add_patient error: {e}")
        return jsonify({"error": "Failed to add patient"}), 500
    if not rows:
        return jsonify({"error": "Failed to add patient"}), 500
    return jsonify({"patient_id": rows[0]["id"], "message": "Patient added successfully"})

# ── consultations ─────────────────────────────────────────────────────────────

@app.route("/api/consultations", methods=["GET"])
@require_auth
def list_consultations():
    user = request.user
    try:
        if user.get("role") == "patient":
            ids = safe_query(sb().table("app_patients").select("id").eq("account_phone", user["phone"]))
            ids = [p["id"] for p in (ids or [])]
            if not ids:
                return jsonify([])
            rows = safe_query(sb().table("consultations").select("*").in_("patient_id", ids).order("created_at", desc=True))
        else:
            rows = safe_query(sb().table("consultations").select("*").eq("doctor_phone", user["phone"]).order("created_at", desc=True))
    except Exception as e:
        logger.error(f"list_consultations error: {e}")
        return jsonify({"error": "Failed to fetch consultations"}), 500
    return jsonify(rows or [])

@app.route("/api/consultations", methods=["POST"])
@require_auth
def create_consultation():
    data    = request.json or {}
    patient_id = data.get("patient_id")
    if not patient_id:
        return jsonify({"error": "patient_id required"}), 400
    room         = f"telemed-{uuid.uuid4()}"
    meeting_link = f"https://meet.jit.si/{room}"
    payload = {
        "patient_id":     patient_id,
        "doctor_phone":   data.get("doctor_id") or data.get("doctor_phone"),
        "symptoms":       data.get("symptoms", ""),
        "meeting_link":   meeting_link,
        "jitsi_room":     room,
        "status":         "pending",
        "diagnosis":      data.get("diagnosis"),
        "prescription":   data.get("prescription"),
        "notes":          data.get("notes"),
        "follow_up_days": data.get("follow_up_days"),
        "severity":       data.get("severity", "mild"),
    }
    try:
        rows = safe_query(sb().table("consultations").insert(payload))
    except Exception as e:
        logger.error(f"create_consultation error: {e}")
        return jsonify({"error": "Failed to create consultation"}), 500
    if not rows:
        return jsonify({"error": "Failed to create consultation"}), 500
    return jsonify({"consultation_id": rows[0]["id"], "meeting_link": meeting_link})

@app.route("/api/consultations/<cid>", methods=["GET"])
@require_auth
def get_consultation(cid):
    try:
        res = sb().table("consultations").select("*").eq("id", cid).maybe_single().execute()
    except Exception as e:
        logger.error(f"get_consultation error: {e}")
        return jsonify({"error": "Database error"}), 500
    if hasattr(res, "error") and res.error:
        logger.error(f"get_consultation query error: {res.error}")
        return jsonify({"error": str(res.error)}), 500
    if not res.data:
        return jsonify({"error": "not found"}), 404
    return jsonify(res.data)

# ── health records (Cloudinary) ───────────────────────────────────────────────

@app.route("/api/health-records", methods=["GET"])
@require_auth
def get_health_records():
    patient = get_self_patient(request.user["phone"])
    if not patient:
        return jsonify({"records": []})
    try:
        rows = safe_query(
            sb().table("health_records").select("*").eq("patient_id", patient["id"]).order("created_at", desc=True)
        )
        return jsonify({"records": rows or []})
    except Exception as e:
        logger.error(f"get_health_records error: {e}")
        return jsonify({"records": []})

@app.route("/api/health-records", methods=["POST"])
@require_auth
@limiter.limit("20 per hour")
def upload_health_record():
    """
    Accepts multipart/form-data with the actual file.
    Flask uploads the file to Cloudinary server-side (avoids browser SSL issues),
    then saves only the Cloudinary URL + metadata to Supabase.
    """
    try:
        from cloudinary_client import upload_file

        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']
        if not file or not file.filename:
            return jsonify({"error": "No file selected"}), 400

        # Validate extension
        allowed = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'}
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
        if ext not in allowed:
            return jsonify({"error": f"File type .{ext} not allowed. Use: PDF, JPG, PNG, GIF, DOC, DOCX"}), 400

        title       = (request.form.get('title') or '').strip()
        record_type = (request.form.get('record_type') or 'report').strip()
        record_date = (request.form.get('record_date') or '').strip()
        notes       = (request.form.get('notes') or '').strip()

        if not title:
            return jsonify({"error": "title is required"}), 400
        if not record_date:
            return jsonify({"error": "record_date is required"}), 400

        # Read file bytes and upload to Cloudinary
        file_bytes = file.read()
        if len(file_bytes) > 20 * 1024 * 1024:
            return jsonify({"error": "File too large. Maximum size is 20 MB"}), 400

        filename = secure_filename(file.filename)
        file_size = f"{round(len(file_bytes) / 1024, 1)} KB"

        result = upload_file(file_bytes, folder="chikitsak/health_records", resource_type="auto")
        file_url = result.get("secure_url", "")

        if not file_url:
            logger.error("Cloudinary upload returned no secure_url")
            return jsonify({"error": "Cloudinary upload failed — no URL returned"}), 500

        # Get patient record
        patient = get_self_patient(request.user["phone"])
        if not patient:
            return jsonify({"error": "Patient not found"}), 404

        # Save metadata to Supabase
        try:
            rows = safe_query(sb().table("health_records").insert({
                "patient_id":  patient["id"],
                "title":       title,
                "record_type": record_type,
                "file_url":    file_url,
                "file_name":   filename,
                "file_size":   file_size,
                "record_date": record_date,
                "notes":       notes,
            }))
        except Exception as e:
            logger.error(f"health_records insert error: {e}")
            return jsonify({"error": "Failed to save record to database"}), 500

        if not rows:
            return jsonify({"error": "Failed to save record"}), 500

        logger.info(f"Health record saved: patient={patient['id']}, file={filename}, url={file_url[:60]}")
        return jsonify({"record": rows[0]}), 201

    except Exception as e:
        logger.error(f"upload_health_record unexpected error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/health-records/<record_id>", methods=["DELETE"])
@require_auth
def delete_health_record(record_id):
    patient = get_self_patient(request.user["phone"])
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    sb().table("health_records").delete().eq("id", record_id).eq("patient_id", patient["id"]).execute()
    return jsonify({"message": "Record deleted successfully"})

@app.route("/api/health-records/<record_id>/download", methods=["GET"])
@require_auth
def download_health_record(record_id):
    patient = get_self_patient(request.user["phone"])
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    res = sb().table("health_records").select("file_url,file_name").eq("id", record_id).eq("patient_id", patient["id"]).maybe_single().execute()
    if not res.data:
        return jsonify({"error": "Record not found"}), 404
    # Return the Cloudinary URL — frontend opens it directly
    return jsonify({"file_url": res.data["file_url"], "file_name": res.data["file_name"]})

# ── medication reminders ──────────────────────────────────────────────────────

@app.route("/api/medication-reminders", methods=["GET"])
@require_auth
def get_medication_reminders():
    patient = get_self_patient(request.user["phone"])
    if not patient:
        return jsonify({"reminders": []})
    res = sb().table("medication_reminders").select("*").eq("patient_id", patient["id"]).order("created_at", desc=True).execute()
    return jsonify({"reminders": res.data or []})

@app.route("/api/medication-reminders", methods=["POST"])
@require_auth
def create_medication_reminder():
    data = request.json or {}
    if not data.get("medicine_name") or not data.get("dosage"):
        return jsonify({"error": "medicine_name and dosage required"}), 400
    patient = get_self_patient(request.user["phone"])
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    row = sb().table("medication_reminders").insert({
        "patient_id":    patient["id"],
        "medicine_name": data["medicine_name"],
        "dosage":        data["dosage"],
        "frequency":     data.get("frequency", "once"),
        "time_slots":    data.get("time_slots", []),
        "start_date":    data.get("start_date"),
        "end_date":      data.get("end_date"),
        "notes":         data.get("notes", ""),
        "active":        True,
    }).execute()
    return jsonify({"reminder": row.data[0] if row.data else {}}), 201

@app.route("/api/medication-reminders/<reminder_id>", methods=["PUT"])
@require_auth
def update_medication_reminder(reminder_id):
    data = request.json or {}
    allowed = {"medicine_name","dosage","frequency","time_slots","start_date","end_date","notes","active","last_taken"}
    update  = {k: v for k, v in data.items() if k in allowed}
    if not update:
        return jsonify({"error": "No valid fields to update"}), 400
    res = sb().table("medication_reminders").update(update).eq("id", reminder_id).execute()
    return jsonify({"reminder": res.data[0] if res.data else {}})

@app.route("/api/medication-reminders/<reminder_id>", methods=["DELETE"])
@require_auth
def delete_medication_reminder(reminder_id):
    sb().table("medication_reminders").delete().eq("id", reminder_id).execute()
    return jsonify({"message": "Reminder deleted successfully"})

# ── settings ──────────────────────────────────────────────────────────────────

@app.route("/api/settings", methods=["GET"])
@require_auth
def get_user_settings():
    phone = request.user["phone"]
    res   = sb().table("user_settings").select("*").eq("account_phone", phone).execute()
    if res.data:
        return jsonify({"settings": res.data[0]})
    # return defaults
    return jsonify({"settings": {
        "language": "en", "low_bandwidth_mode": False,
        "push_notifications": True, "medication_reminders_enabled": True,
        "appointment_reminders": True
    }})

@app.route("/api/settings", methods=["PUT"])
@require_auth
def update_user_settings():
    phone = request.user["phone"]
    data  = request.json or {}
    settings = data.get("settings", data)
    allowed  = {"language","low_bandwidth_mode","push_notifications","medication_reminders_enabled","appointment_reminders"}
    update   = {k: v for k, v in settings.items() if k in allowed}
    update["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    sb().table("user_settings").upsert({"account_phone": phone, **update}).execute()
    return jsonify({"settings": update})

# ── health education (static) ─────────────────────────────────────────────────

HEALTH_EDUCATION = [
    {"id":"1","title":"Preventive Healthcare in Rural Areas","description":"Learn preventive measures and regular checkups.","content_type":"article","category":"prevention","author":"Dr. Sharma","duration":"5 min read","views_count":1250,"likes_count":42,"published_date":"2023-05-15"},
    {"id":"2","title":"Healthy Cooking for Families","description":"Simple nutritious recipes for village families.","content_type":"video","category":"nutrition","author":"Nutritionist Kaur","duration":"8 min","views_count":890,"likes_count":35,"published_date":"2023-06-22"},
    {"id":"3","title":"Managing Diabetes in Village Settings","description":"Practical tips with locally available resources.","content_type":"article","category":"chronic","author":"Dr. Patel","duration":"10 min read","views_count":2100,"likes_count":87,"published_date":"2023-04-10"},
    {"id":"4","title":"Yoga Basics for Beginners","description":"Beginner yoga poses to improve flexibility and reduce stress.","content_type":"video","category":"exercise","author":"Yoga Instructor Singh","duration":"12 min","views_count":1560,"likes_count":68,"published_date":"2023-07-05"},
    {"id":"5","title":"Mental Wellness in Rural Settings","description":"Managing stress and anxiety in rural communities.","content_type":"article","category":"mentalHealth","author":"Dr. Reddy","duration":"7 min read","views_count":980,"likes_count":51,"published_date":"2023-08-12"},
]

@app.route("/api/health-education", methods=["GET"])
def get_health_education_content():
    return jsonify({"content": HEALTH_EDUCATION})

# ── pharmacies / hospitals ────────────────────────────────────────────────────

@app.route("/api/pharmacies", methods=["GET"])
def get_pharmacies():
    try:
        res = sb().table("pharmacies").select("*").execute()
        return jsonify(res.data or [])
    except Exception as e:
        print(f"Pharmacy fetch error: {e}")
        return jsonify([])

@app.route("/api/pharmacies/<pharmacy_id>/stock", methods=["GET"])
def get_pharmacy_stock(pharmacy_id):
    try:
        res = sb().table("pharmacy_stock").select("*").eq("pharmacy_id", pharmacy_id).execute()
        stock = {row["medicine_name"]: row for row in (res.data or [])}
        return jsonify({"pharmacy_id": pharmacy_id, "stock": stock})
    except Exception as e:
        return jsonify({"pharmacy_id": pharmacy_id, "stock": {}})

@app.route("/api/hospitals", methods=["GET"])
def get_hospitals():
    lat    = request.args.get("lat", type=float)
    lng    = request.args.get("lng", type=float)
    radius = request.args.get("radius", 50, type=float)
    limit  = request.args.get("limit", 12, type=int)
    if lat is None or lng is None:
        return jsonify({"error": "lat and lng required"}), 400
    try:
        hospitals = find_nearby_hospitals(latitude=lat, longitude=lng, radius_km=radius, limit=limit)
        return jsonify({"count": len(hospitals), "hospitals": hospitals})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── AI endpoints ──────────────────────────────────────────────────────────────

@app.route("/api/chat", methods=["POST"])
@require_auth
def chat():
    data    = request.json or {}
    message = data.get("message", "")
    if not message:
        return jsonify({"error": "message required"}), 400
    # Try LM Studio → Gemini fallback
    try:
        resp = requests.post(LMSTUDIO_URL, json={"model": DEFAULT_MODEL, "messages": [{"role":"user","content":message}]}, timeout=5)
        resp.raise_for_status()
        reply = clean_text(resp.json()["choices"][0]["message"]["content"])
        return jsonify({"reply": reply, "source": "lmstudio"})
    except Exception:
        pass
    GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
    if not GEMINI_KEY:
        return jsonify({"reply": "AI chat is currently unavailable.", "source": "fallback"})
    try:
        url  = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        resp = requests.post(url, headers={"x-goog-api-key": GEMINI_KEY, "Content-Type": "application/json"},
                             json={"contents":[{"parts":[{"text":message}]}],"generationConfig":{"maxOutputTokens":300}}, timeout=10)
        resp.raise_for_status()
        reply = clean_text(resp.json()["candidates"][0]["content"]["parts"][0]["text"])
        return jsonify({"reply": reply, "source": "gemini"})
    except Exception as e:
        return jsonify({"reply": "AI chat is temporarily unavailable.", "source": "error"})

@app.route("/api/ai/symptom", methods=["POST"])
@require_auth
@limiter.limit("50 per hour")
def ai_symptom():
    data     = request.get_json(force=True) or {}
    prompt   = data.get("prompt") or data.get("message") or data.get("text", "")
    messages = data.get("messages")
    symptoms = data.get("symptoms", [])
    if not prompt and not messages:
        return jsonify({"error": "prompt or messages required"}), 400
    system_prompt = "You are a medical assistant for rural India. Give simple clear health advice. Mention when to see a doctor. Keep response under 150 words."
    if symptoms:
        system_prompt += f"\nPatient symptoms: {', '.join([s.get('name', s.get('id','')) for s in symptoms])}"
    if not messages:
        messages = [{"role":"user","content":prompt}]
    messages.insert(0, {"role":"system","content":system_prompt})
    messages = inject_plaintext(messages)
    # LM Studio first
    try:
        resp = requests.post(LMSTUDIO_URL, json={"model":DEFAULT_MODEL,"messages":messages,"max_tokens":300,"temperature":0.3}, timeout=5)
        resp.raise_for_status()
        return jsonify({"message": clean_text(resp.json()["choices"][0]["message"]["content"]), "source":"lmstudio"})
    except Exception:
        pass
    GEMINI_KEY = os.getenv("GEMINI_API_KEY","")
    if not GEMINI_KEY:
        return jsonify({"message":"AI assistant is currently unavailable.","source":"fallback"})
    try:
        url  = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        resp = requests.post(url, headers={"x-goog-api-key":GEMINI_KEY,"Content-Type":"application/json"},
                             json={"system_instruction":{"parts":[{"text":system_prompt}]},"contents":[{"parts":[{"text":prompt or messages[-1].get("content","")}]}],"generationConfig":{"temperature":0.3,"maxOutputTokens":300}}, timeout=10)
        resp.raise_for_status()
        return jsonify({"message": resp.json()["candidates"][0]["content"]["parts"][0]["text"], "source":"gemini"})
    except Exception as e:
        return jsonify({"message":"AI assistant is temporarily unavailable.","source":"error"})

@app.route("/api/ai/voice-analyze", methods=["POST"])
@require_auth
@limiter.limit("20 per hour")
def voice_analyze():
    data       = request.get_json() or {}
    transcript = data.get("transcript","")
    symptoms   = data.get("symptoms",{})
    lang       = data.get("lang","en")
    detected   = [k.replace("_"," ") for k,v in symptoms.items() if v==1]
    GEMINI_KEY = os.getenv("GEMINI_API_KEY","")
    if not GEMINI_KEY:
        return jsonify({"summary":"","advice":"","see_doctor":True})
    lang_inst = {"hi":"Respond in simple Hindi (Hinglish ok).","pa":"Respond in simple Punjabi or Hindi.","en":"Respond in simple English."}.get(lang,"Respond in simple English.")
    prompt = f"""Medical triage assistant in India. Patient said: "{transcript}"
Detected symptoms: {', '.join(detected) if detected else 'none'}
{lang_inst}
3-4 sentences: likely condition, one home care tip, see doctor yes/no.
Return ONLY JSON: {{"summary":"...","advice":"...","see_doctor":true/false}}"""
    try:
        url  = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        resp = requests.post(url, headers={"x-goog-api-key":GEMINI_KEY,"Content-Type":"application/json"},
                             json={"contents":[{"parts":[{"text":prompt}]}],"generationConfig":{"temperature":0.3,"maxOutputTokens":300,"responseMimeType":"application/json"}}, timeout=10)
        resp.raise_for_status()
        parsed = json.loads(resp.json()["candidates"][0]["content"]["parts"][0]["text"])
        return jsonify({"summary":parsed.get("summary",""),"advice":parsed.get("advice",""),"see_doctor":parsed.get("see_doctor",True)})
    except Exception as e:
        print(f"Gemini voice-analyze error: {e}")
        return jsonify({"summary":"","advice":"","see_doctor":True})

# ── AI Conversation Symptom Chat ─────────────────────────────────────────────

CHAT_SYSTEM_PROMPT = """You are Chikitsak AI — a friendly, trusted health assistant for rural India (Jharkhand region).

LANGUAGE RULES (CRITICAL):
- Detect the language the patient is using: Hindi, Hinglish, Khortha, Bengali, Nagpuri, Santali, English
- ALWAYS reply in the EXACT same language and script the patient used
- If patient writes in Hindi/Devanagari → reply in Hindi/Devanagari
- If patient writes in Hinglish (Roman Hindi) → reply in Hinglish
- If patient writes in Bengali → reply in Bengali
- If patient writes in English → reply in English
- Match their vocabulary level — use simple words a village person understands
- Use warm, caring tone like a trusted family doctor (not clinical/cold)

RESPONSE FORMAT (always use this structure):
🔍 *Kya ho sakta hai:* [1-2 lines about likely cause in patient's language]
🏠 *Ghar pe kya karein:* [2-3 specific home remedies using locally available items]
💊 *Agar zaroorat ho:* [OTC medicine suggestion ONLY if clearly needed — see rules below]
🏥 *Doctor kab jayein:* [specific warning signs that need doctor visit]

MEDICINE RULES:
- After 2+ patient messages, you MAY suggest basic OTC medicines available at any chemist
- ALLOWED: Paracetamol 500mg (bukhar/dard), ORS (dast/ulti), Antacid like Gelusil (pet dard), Cetirizine 10mg (allergy/kharish), Betadine (ghav), Vicks/steam (sardi/khansi)
- NEVER suggest: Antibiotics, steroids, blood pressure medicines, diabetes medicines, injections, any Schedule H drug
- ALWAYS add after medicine: "(Chemist se milega, doctor se confirm karein)"
- If less than 2 messages exchanged, skip the 💊 section entirely

EMERGENCY DETECTION:
- If patient mentions: chest pain, seene mein dard, heart attack, stroke, unconscious, behoshi, severe bleeding, zyaada khoon, can't breathe, sans nahi, seizure, fitting, paralysis
- IMMEDIATELY respond with: 🚨 EMERGENCY — Turant 108 call karein! (Then brief first aid)
- Set is_emergency: true in response

STRICT RULES:
- Never prescribe Schedule H/H1 drugs (antibiotics, steroids, etc.)
- Never diagnose definitively — always say "ho sakta hai" or "lagta hai"
- Always recommend doctor if symptoms are severe or persist > 3 days
- Keep response concise — max 150 words
- No medical jargon — use words a farmer/village person understands

CONTEXT: Patient is from rural Jharkhand. They may have limited access to doctors. Your advice should be practical and actionable with locally available resources."""

FUZZY_SYMPTOM_KEYWORDS = {
    "fever":            ["fever","bukhar","bukhaar","tapp","garmi","temperature","tap","bokhaar","jwar"],
    "headache":         ["headache","sar dard","sir dard","sar","sir","head","matha","mathaa","migraine"],
    "cough":            ["cough","khansi","khaansi","khaasi","khas","khanshi","khaanshi"],
    "stomach_pain":     ["stomach","pet","pait","peth","abdomen","belly","tummy","pet dard","pait dard"],
    "diarrhea":         ["diarrhea","dast","daast","loose motion","loose","potty","latrine"],
    "vomiting":         ["vomit","ulti","ultee","qay","utti","throwing up"],
    "nausea":           ["nausea","ji machlana","matli","ulti jaisi","sick"],
    "fatigue":          ["tired","thakan","kamzori","weak","thaka","exhausted","bimaar","weakness"],
    "dizziness":        ["dizzy","chakkar","chakker","ghoomna","vertigo","spinning"],
    "shortness_breath": ["breath","saans","sans","breathless","dam","ghutna","breathing"],
    "sore_throat":      ["throat","gala","gale","sore throat","gala dard","gale mein"],
    "runny_nose":       ["nose","naak","nazla","sneezing","chheenk","runny","nasal"],
    "joint_pain":       ["joint","jod","jodo","joints","jod dard","arthritis"],
    "back_pain":        ["back","kamar","peeth","spine","kamar dard","peeth dard"],
    "muscle_pain":      ["muscle","body pain","badan","body dard","maans","body ache"],
    "rash":             ["rash","daane","skin","twacha","eruption","chechak"],
    "itching":          ["itch","kharish","khujli","scratching","khujlee"],
    "chest_pain":       ["chest","seena","seene","sine","heart","dil","chest pain","seene mein dard"],
    "swelling":         ["swelling","sujan","soojan","swollen","swell"],
    "wounds":           ["wound","ghav","chot","cut","injury","zakhm","bleeding","khoon"],
}

def fuzzy_extract_symptoms(text: str) -> list:
    """Extract symptoms using fuzzy word-level matching."""
    lower = text.lower()
    words = set(re.findall(r'\w+', lower))
    detected = []
    for symptom, keywords in FUZZY_SYMPTOM_KEYWORDS.items():
        for kw in keywords:
            kw_words = set(kw.split())
            # Match if ALL words of keyword appear in text
            if kw_words.issubset(words) or kw in lower:
                detected.append(symptom)
                break
    return list(set(detected))

def detect_emergency(text: str) -> bool:
    emergency_phrases = [
        "chest pain","seene mein dard","sine mein dard","heart attack","dil ka daura",
        "stroke","unconscious","behoshi","hosh nahi","severe bleeding","zyaada khoon",
        "cant breathe","sans nahi","saans nahi","seizure","fitting","paralysis","laqwa"
    ]
    lower = text.lower()
    return any(phrase in lower for phrase in emergency_phrases)

@app.route("/api/ai/chat-symptom", methods=["POST"])
@require_auth
@limiter.limit("100 per hour")
def chat_symptom():
    """
    Multilingual conversational symptom checker.
    Detects language automatically, replies in same language.
    Suggests OTC medicines after 2+ exchanges.
    Emergency detection with 108 routing.
    """
    data = request.get_json(force=True) or {}
    message  = data.get("message", "").strip()
    history  = data.get("history", [])   # [{role, content}, ...]
    patient_id = data.get("patient_id")

    if not message:
        return jsonify({"error": "message required"}), 400

    # Emergency check first
    is_emergency = detect_emergency(message)

    # Fuzzy symptom extraction
    symptoms_detected = fuzzy_extract_symptoms(message)
    # Also check history for cumulative symptoms
    for h in history:
        if h.get("role") == "user":
            symptoms_detected = list(set(symptoms_detected + fuzzy_extract_symptoms(h.get("content", ""))))

    exchange_count = len([h for h in history if h.get("role") == "user"])

    GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

    # Build conversation for Gemini
    gemini_contents = []
    for h in history[-6:]:  # last 6 messages for context
        role = "user" if h.get("role") == "user" else "model"
        gemini_contents.append({"role": role, "parts": [{"text": h.get("content", "")}]})
    gemini_contents.append({"role": "user", "parts": [{"text": message}]})

    # Add context about exchange count to system prompt
    system = CHAT_SYSTEM_PROMPT
    if exchange_count < 2:
        system += "\n\nNOTE: This is early in conversation (less than 2 exchanges). Do NOT suggest any medicines yet. Focus on understanding symptoms and giving home remedies only."
    else:
        system += f"\n\nNOTE: Patient has sent {exchange_count + 1} messages. You may now suggest basic OTC medicines if clearly needed."

    if symptoms_detected:
        system += f"\n\nDetected symptoms so far: {', '.join(symptoms_detected)}"

    reply = ""
    source = "fallback"

    # Try LM Studio first (local, fast)
    try:
        lm_messages = [{"role": "system", "content": system}]
        for h in history[-6:]:
            lm_messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        lm_messages.append({"role": "user", "content": message})
        resp = requests.post(
            LMSTUDIO_URL,
            json={"model": DEFAULT_MODEL, "messages": lm_messages, "max_tokens": 400, "temperature": 0.4},
            timeout=5
        )
        resp.raise_for_status()
        reply = clean_text(resp.json()["choices"][0]["message"]["content"])
        source = "lmstudio"
    except Exception:
        pass

    # Gemini fallback
    if not reply and GEMINI_KEY:
        try:
            url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
            resp = requests.post(
                url,
                headers={"x-goog-api-key": GEMINI_KEY, "Content-Type": "application/json"},
                json={
                    "system_instruction": {"parts": [{"text": system}]},
                    "contents": gemini_contents,
                    "generationConfig": {"temperature": 0.4, "maxOutputTokens": 400}
                },
                timeout=15
            )
            resp.raise_for_status()
            reply = clean_text(resp.json()["candidates"][0]["content"]["parts"][0]["text"])
            source = "gemini"
        except Exception as e:
            logger.error(f"Gemini chat-symptom error: {e}")

    if not reply:
        reply = "Abhi AI service available nahi hai. Kripya thodi der baad try karein ya doctor se milein."
        source = "fallback"

    # Save chat to Supabase if patient_id provided
    if patient_id:
        try:
            safe_query(sb().table("ai_chat_sessions").insert({
                "patient_id": patient_id,
                "user_message": message,
                "ai_reply": reply,
                "symptoms_detected": symptoms_detected,
                "is_emergency": is_emergency,
                "exchange_count": exchange_count + 1,
                "source": source,
            }))
        except Exception as e:
            logger.warning(f"Failed to save chat session: {e}")

    return jsonify({
        "reply": reply,
        "symptoms_detected": symptoms_detected,
        "is_emergency": is_emergency,
        "exchange_count": exchange_count + 1,
        "source": source,
    })

# ── run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("Starting Digital Chikitsak backend on port 5000")
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)

