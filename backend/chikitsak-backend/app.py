"""
app.py — Digital Chikitsak Flask Backend
All data stored in Supabase. No MySQL dependency.
Flask handles: JWT auth, AI endpoints, Cloudinary uploads, hospital GeoJSON.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import uuid, requests, os, json, datetime
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import re, jwt
from supabase_client import get_supabase
from hospital_data import find_nearby_hospitals

load_dotenv()

LMSTUDIO_URL = os.getenv("LMSTUDIO_URL", "http://127.0.0.1:1234/v1/chat/completions")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "qwen3")
JWT_SECRET    = os.getenv("JWT_SECRET", "dev-secret-change")
JWT_ALG       = "HS256"

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

def get_self_patient(phone):
    """Return the 'Self' app_patient row for this account, create if missing."""
    res = sb().table("app_patients").select("*").eq("account_phone", phone).eq("relation", "Self").limit(1).execute()
    if res.data:
        return res.data[0]
    # auto-create
    acc = sb().table("accounts").select("name").eq("phone", phone).maybe_single().execute()
    name = acc.data["name"] if acc.data else phone
    new = sb().table("app_patients").insert({
        "account_phone": phone, "name": name, "relation": "Self", "patient_phone": phone
    }).execute()
    return new.data[0] if new.data else None

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
    # check duplicate
    existing = sb().table("accounts").select("phone").eq("phone", phone).execute()
    if existing.data:
        return jsonify({"error": "Phone number already registered"}), 409
    hashed = generate_password_hash(pin)
    sb().table("accounts").insert({"phone": phone, "pin_hash": hashed, "name": name, "role": role}).execute()
    # create self patient row
    if role == "patient":
        sb().table("app_patients").insert({
            "account_phone": phone, "name": name, "relation": "Self", "patient_phone": phone
        }).execute()
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
    res = sb().table("accounts").select("*").eq("phone", phone).maybe_single().execute()
    if not res.data or not check_password_hash(res.data["pin_hash"], pin):
        return jsonify({"error": "invalid credentials"}), 401
    row  = res.data
    user = {"phone": row["phone"], "name": row["name"], "role": row["role"]}
    # ensure self patient exists
    if user["role"] == "patient":
        get_self_patient(phone)
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
    if user.get("role") == "patient":
        res = sb().table("app_patients").select("*").eq("account_phone", user["phone"]).execute()
        rows = res.data or []
        if not rows:
            p = get_self_patient(user["phone"])
            rows = [p] if p else []
    else:
        phone = request.args.get("phone")
        if phone:
            res = sb().table("app_patients").select("*").eq("account_phone", phone).execute()
        else:
            res = sb().table("app_patients").select("*").limit(100).execute()
        rows = res.data or []
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
    res = sb().table("app_patients").insert(payload).execute()
    if not res.data:
        return jsonify({"error": "Failed to add patient"}), 500
    return jsonify({"patient_id": res.data[0]["id"], "message": "Patient added successfully"})

# ── consultations ─────────────────────────────────────────────────────────────

@app.route("/api/consultations", methods=["GET"])
@require_auth
def list_consultations():
    user = request.user
    if user.get("role") == "patient":
        # get all patient ids for this account
        pts = sb().table("app_patients").select("id").eq("account_phone", user["phone"]).execute()
        ids = [p["id"] for p in (pts.data or [])]
        if not ids:
            return jsonify([])
        res = sb().table("consultations").select("*").in_("patient_id", ids).order("created_at", desc=True).execute()
    else:
        res = sb().table("consultations").select("*").eq("doctor_phone", user["phone"]).order("created_at", desc=True).execute()
    return jsonify(res.data or [])

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
    res = sb().table("consultations").insert(payload).execute()
    if not res.data:
        return jsonify({"error": "Failed to create consultation"}), 500
    row = res.data[0]
    return jsonify({"consultation_id": row["id"], "meeting_link": meeting_link})

@app.route("/api/consultations/<cid>", methods=["GET"])
@require_auth
def get_consultation(cid):
    res = sb().table("consultations").select("*").eq("id", cid).maybe_single().execute()
    if not res.data:
        return jsonify({"error": "not found"}), 404
    return jsonify(res.data)

# ── health records (Cloudinary) ───────────────────────────────────────────────

ALLOWED_EXTENSIONS = {'txt','pdf','png','jpg','jpeg','gif','doc','docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/api/health-records", methods=["GET"])
@require_auth
def get_health_records():
    patient = get_self_patient(request.user["phone"])
    if not patient:
        return jsonify({"records": []})
    res = sb().table("health_records").select("*").eq("patient_id", patient["id"]).order("created_at", desc=True).execute()
    return jsonify({"records": res.data or []})

@app.route("/api/health-records", methods=["POST", "OPTIONS"])
@cross_origin()
@require_auth
@limiter.limit("10 per hour")
def upload_health_record():
    try:
        from cloudinary_client import upload_file
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        file = request.files['file']
        if not file.filename or not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type"}), 400
        title       = request.form.get('title')
        record_type = request.form.get('record_type', 'report')
        record_date = request.form.get('record_date')
        notes       = request.form.get('notes', '')
        if not title or not record_date:
            return jsonify({"error": "Title and record date are required"}), 400

        # Upload to Cloudinary
        file_bytes = file.read()
        filename   = secure_filename(file.filename)
        result     = upload_file(file_bytes, folder="health_records")
        file_url   = result.get("secure_url", "")
        file_size  = f"{round(len(file_bytes)/1024, 1)} KB"

        patient = get_self_patient(request.user["phone"])
        if not patient:
            return jsonify({"error": "Patient not found"}), 404

        row = sb().table("health_records").insert({
            "patient_id":  patient["id"],
            "title":       title,
            "record_type": record_type,
            "file_url":    file_url,
            "file_name":   filename,
            "file_size":   file_size,
            "record_date": record_date,
            "notes":       notes,
        }).execute()
        return jsonify({"record": row.data[0] if row.data else {}}), 201
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({"error": "Failed to upload health record"}), 500

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

# ── run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)

