"""
Android App Backend — Digital Chikitsak
A dedicated, lightweight Flask server for the patient mobile app.
Uses the SAME Supabase tables as the web frontend.
Does NOT interfere with the main web backend.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os, datetime, jwt
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from supabase import create_client

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL  = os.getenv("SUPABASE_URL")
SUPABASE_KEY  = os.getenv("SUPABASE_PUBLISHABLE_KEY")
JWT_SECRET    = os.getenv("JWT_SECRET", "dev-secret-change")
JWT_ALG       = "HS256"

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=False)

def sb():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def make_token(payload: dict) -> str:
    return jwt.encode(
        {**payload, "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=30)},
        JWT_SECRET, algorithm=JWT_ALG
    )

def get_user():
    """Decode JWT from Authorization header. Returns user dict or None."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        return jwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        return None

def auth_required(fn):
    from functools import wraps
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = get_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        request.user = user
        return fn(*args, **kwargs)
    return wrapper

# ── Health ────────────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    return jsonify({"ok": True, "service": "android-backend"})

# ── Auth ──────────────────────────────────────────────────────────────────────

@app.route("/api/register", methods=["POST"])
def register():
    data = request.json or {}
    phone = (data.get("phone") or "").strip()
    pin   = (data.get("pin") or data.get("password") or "").strip()
    name  = (data.get("name") or "").strip()
    age   = data.get("age")

    if not phone or not pin or not name:
        return jsonify({"error": "phone, pin, and name are required"}), 400
    if len(phone) != 10 or not phone.isdigit():
        return jsonify({"error": "Phone must be exactly 10 digits"}), 400
    if len(pin) < 4:
        return jsonify({"error": "PIN must be at least 4 characters"}), 400

    # Check if already registered
    existing = sb().table("accounts").select("phone").eq("phone", phone).execute()
    if existing.data:
        return jsonify({"error": "Phone number already registered. Please login."}), 409

    # Save to accounts table (same as web)
    pin_hash = generate_password_hash(pin)
    sb().table("accounts").insert({
        "phone": phone, "pin_hash": pin_hash, "name": name, "role": "patient"
    }).execute()

    # Also create a patient profile row (same table web uses)
    patient_data = {"name": name, "phone": phone}
    if age:
        patient_data["age"] = int(age) if str(age).isdigit() else None
    
    existing_patient = sb().table("patients").select("id").eq("phone", phone).execute()
    if not existing_patient.data:
        sb().table("patients").insert(patient_data).execute()

    user  = {"phone": phone, "name": name, "role": "patient"}
    token = make_token(user)
    return jsonify({"token": token, "user": user}), 201

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    phone = (data.get("phone") or "").strip()
    pin   = (data.get("pin") or data.get("password") or "").strip()

    if not phone or not pin:
        return jsonify({"error": "phone and pin are required"}), 400

    res = sb().table("accounts").select("*").eq("phone", phone).execute()
    if not res.data:
        return jsonify({"error": "Phone number not registered"}), 401

    account = res.data[0]
    if not check_password_hash(account["pin_hash"], pin):
        return jsonify({"error": "Wrong PIN. Please try again."}), 401

    user  = {"phone": account["phone"], "name": account["name"], "role": account["role"]}
    token = make_token(user)
    return jsonify({"token": token, "user": user})

# ── Patient Profile ───────────────────────────────────────────────────────────

@app.route("/api/patients", methods=["GET"])
@auth_required
def get_patient():
    phone = request.user["phone"]
    res = sb().table("patients").select("*").eq("phone", phone).execute()
    if res.data:
        return jsonify(res.data[0])
    # Auto-create patient row if missing
    name = request.user.get("name", phone)
    new  = sb().table("patients").insert({"phone": phone, "name": name}).execute()
    return jsonify(new.data[0] if new.data else {"phone": phone, "name": name})

@app.route("/api/patients", methods=["POST"])
@auth_required
def update_patient():
    data = request.json or {}
    phone = request.user["phone"]
    allowed = {k: v for k, v in data.items() if k in ["name", "age"]}
    res = sb().table("patients").update(allowed).eq("phone", phone).execute()
    return jsonify(res.data[0] if res.data else {})

# ── Reminders ─────────────────────────────────────────────────────────────────

@app.route("/api/reminders", methods=["GET"])
@auth_required
def get_reminders():
    phone = request.user["phone"]
    # Get patient id first
    p = sb().table("patients").select("id").eq("phone", phone).execute()
    if not p.data:
        return jsonify([])
    patient_id = p.data[0]["id"]
    res = sb().table("medication_reminders").select("*").eq("patient_id", patient_id).execute()
    return jsonify(res.data or [])

@app.route("/api/reminders", methods=["POST"])
@auth_required
def create_reminder():
    phone = request.user["phone"]
    data  = request.json or {}
    p = sb().table("patients").select("id").eq("phone", phone).execute()
    if not p.data:
        return jsonify({"error": "Patient profile not found"}), 404
    data["patient_id"] = p.data[0]["id"]
    # Only include known columns
    payload = {k: v for k, v in data.items() if k in ["patient_id", "medicine_name", "medicine", "time", "frequency", "notes", "active"]}
    res = sb().table("medication_reminders").insert(payload).execute()
    return jsonify(res.data[0] if res.data else {}), 201

@app.route("/api/reminders/<int:rid>", methods=["DELETE"])
@auth_required
def delete_reminder(rid):
    sb().table("medication_reminders").delete().eq("id", rid).execute()
    return jsonify({"ok": True})

# ── Health Records ────────────────────────────────────────────────────────────

@app.route("/api/health-records", methods=["GET"])
@auth_required
def get_health_records():
    phone = request.user["phone"]
    p = sb().table("patients").select("id").eq("phone", phone).execute()
    if not p.data:
        return jsonify([])
    res = sb().table("health_records").select("*").eq("patient_id", p.data[0]["id"]).order("created_at", desc=True).execute()
    return jsonify(res.data or [])

@app.route("/api/health-records", methods=["POST"])
@auth_required
def add_health_record():
    phone = request.user["phone"]
    data  = request.json or {}
    p = sb().table("patients").select("id").eq("phone", phone).execute()
    if not p.data:
        return jsonify({"error": "Patient not found"}), 404
    data["patient_id"] = p.data[0]["id"]
    res = sb().table("health_records").insert(data).execute()
    return jsonify(res.data[0] if res.data else {}), 201

# ── Doctors ───────────────────────────────────────────────────────────────────

@app.route("/api/doctors", methods=["GET"])
@auth_required
def get_doctors():
    specialization = request.args.get("specialization")
    query = sb().table("doctors").select("id,name,specialization,status,avg_consult_time,bio,experience,qualification,hospital,profile_image,languages").eq("is_onboarded", True)
    if specialization:
        query = query.eq("specialization", specialization)
    res = query.execute()
    return jsonify(res.data or [])

# ── Hospitals (nearby) ────────────────────────────────────────────────────────

@app.route("/api/hospitals", methods=["GET"])
@auth_required
def get_hospitals():
    # Return static placeholder until geolocation is wired in
    return jsonify([
        {"name": "Nearby hospitals are loaded from device GPS", "address": "Use BookDoctorScreen for real locations"}
    ])

# ── AI / Symptom ──────────────────────────────────────────────────────────────

@app.route("/api/ai/symptom", methods=["POST"])
@auth_required
def ai_symptom():
    data = request.json or {}
    symptoms = data.get("symptoms", [])
    # Forward to Gemini / LM Studio if available else return basic response
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key and symptoms:
        try:
            import requests as req
            prompt = f"Patient symptoms (rural India context, Hindi-friendly): {', '.join(symptoms)}. Give a short, simple health advice in 2-3 sentences. Do not diagnose, just advise."
            resp = req.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}",
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=15
            )
            if resp.status_code == 200:
                text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                return jsonify({"advice": text, "see_doctor": any(s in symptoms for s in ["chest pain", "breathlessness", "fever"])})
        except Exception:
            pass
    return jsonify({"advice": "Aapke symptoms ke liye doctor se milna zaroori hai.", "see_doctor": True})

# ── Pharmacies ────────────────────────────────────────────────────────────────

@app.route("/api/pharmacies", methods=["GET"])
@auth_required
def get_pharmacies():
    return jsonify([
        {"name": "Aapke nazdiki dawai ki dukaan", "note": "GPS se load ho rahi hai..."}
    ])

# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("✅ Digital Chikitsak — Android Backend")
    print(f"   Supabase: {SUPABASE_URL}")
    app.run(host="0.0.0.0", port=5050, debug=False, use_reloader=False)
