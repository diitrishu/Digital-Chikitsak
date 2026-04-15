# Digital Chikitsak

A telemedicine platform for rural healthcare in India. Multi-language (English, Hindi, Punjabi), voice-first symptom input, AI-powered triage, real-time doctor queue, and video consultations via Jitsi.

**No MySQL required.** All data is stored in Supabase. Works fully deployed.

---

## What's Working

### Patient Flow
- **Voice Onboarding** — on opening `/patient`, a mic button appears. Patient taps, speaks symptoms in Hindi/Punjabi/English. Keyword extraction maps speech to 20 symptoms. Emergency phrases trigger immediate routing. Falls back to manual input if mic is denied or unsupported. Interim words shown live as patient speaks.
- **Smart Consultation** — 4-step flow: describe symptoms (voice + text + quick-tap chips) → confirm detected symptoms + triage priority → ML disease prediction result → live queue view
- **Token Queue** (`/patient/tokens`) — shows active queue position with live Realtime updates. Survives page refresh by looking up active token from Supabase. Shows Jitsi call link when it's your turn. Leave queue button to cancel.
- **Pharmacy Finder** — locate nearby pharmacies, check medicine stock
- **Health Records** — upload documents (PDF, images, docs) to Cloudinary, view/download via Cloudinary URL
- **Medication Reminders** — create and track medication schedules
- **Family Members** — manage health profiles for multiple family members
- **Health Education** — browse articles and videos by category
- **Voice Assistance** — voice-based health guidance
- **Chat** — async messaging with doctors (text, voice notes, video messages, file attachments via Cloudinary)
- **Settings** — account preferences synced to Supabase
- **Emergency Help** — one-tap access to ambulance (108), police (100), hospitals

### Doctor Flow
- **Onboarding** — 3-step setup: specialization → credentials → profile photo. Creates or updates doctor row in Supabase. Stores `supabase_doctor_id` in localStorage for queue operations.
- **Dashboard** — stats (waiting / in-call / done today), recent patients, quick actions. Redirects to onboarding if not set up.
- **Queue** (`/doctor/queue`) — real-time patient queue via Supabase Realtime. Each patient card is expandable showing symptoms, ML prediction, AI summary, voice transcript, wait time. Status toggle: online / break / offline.
- **Call Patient** — generates Jitsi room, updates token to `in_consultation`, doctor status to `in_call`
- **Post-Consultation Notes** — after call ends: fill diagnosis, prescription, clinical notes, severity, follow-up days. Saves to Supabase `consultation_notes`, marks token done, resets doctor to online.
- **Patients** — view all patients who consulted this doctor. Expandable drawer with symptoms, ML prediction, consultation notes editor (saves to `consultation_notes` with upsert).
- **Profile** — edit specialization, qualification, experience, hospital, bio, languages, photo (Cloudinary)
- **Chat / Inbox** — async messaging with patients. Supports text, voice notes, video messages, file attachments. All media via Cloudinary. Realtime updates.

### AI & ML
- **Disease Prediction** (port 5001) — Decision Tree classifier on 20 symptoms, returns predicted disease, confidence score, remedy, and whether to see a doctor
- **AI Symptom Chat** — tries LM Studio (Qwen3, local) first with 5s timeout, falls back to Gemini `gemini-2.0-flash` automatically
- **Voice Analysis** — Gemini analyzes voice transcript, returns structured JSON summary in patient's language (EN/HI/PA)
- **Smart Doctor Routing** — `find_best_doctor` Supabase RPC matches symptoms to specialization, picks least-loaded online doctor. Client-side fallback if RPC unavailable.

### Infrastructure
- **Supabase only** — no MySQL. All app data (accounts, patients, records, reminders, settings, queue, chat) in Supabase PostgreSQL
- **Supabase Realtime** — live queue updates on `tokens` and `doctors` tables; live chat on `consultation_messages`
- **Rate Limiting** — `flask-limiter` on auth (10/hr register, 20/min login) and AI endpoints (50/hr symptom, 20/hr voice-analyze)
- **Cloudinary** — health record uploads, profile photos, voice notes, video messages, file attachments
- **GeoJSON Hospital Data** — nearby hospital lookup from local files (no external API needed)
- **Offline queue** — pending actions saved to localStorage, flushed automatically when back online
- **Low Bandwidth Mode** — toggle to reduce data usage

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3, Framer Motion 7 |
| Routing | React Router v6 |
| State / Data | Supabase JS 2, Axios, React Hot Toast |
| i18n | i18next (en / hi / pa) |
| Backend (main) | Flask 2.3, PyJWT, Flask-CORS, Flask-Limiter |
| Backend (ML) | Flask, Scikit-learn, Pandas, NumPy, Joblib |
| Database | Supabase PostgreSQL + Realtime (all data) |
| File Storage | Cloudinary |
| Video | Jitsi Meet |
| Local AI | LM Studio (Qwen3) |
| Cloud AI | Google Gemini 2.0 Flash (fallback) |

---

## Project Structure

```
Digital-Chikitsak/
├── backend/chikitsak-backend/
│   ├── app.py                  # Main Flask API (port 5000) — Supabase only, no MySQL
│   ├── api.py                  # Disease prediction API (port 5001)
│   ├── disease_predictor.py    # ML prediction engine
│   ├── train_model.py          # Model training script
│   ├── hospital_data.py        # GeoJSON hospital lookup
│   ├── supabase_client.py      # Supabase client (lazy singleton)
│   ├── cloudinary_client.py    # Cloudinary upload helpers
│   ├── models/
│   │   └── disease_model.joblib
│   ├── data/
│   │   ├── hospitals.geojson
│   │   └── hospitals_india_polygons.geojson
│   ├── requirements.txt
│   └── .env
└── frontend/rishu-diital-chikitsak/
    ├── src/
    │   ├── router.jsx
    │   ├── App.jsx
    │   ├── utils/
    │   │   └── offlineQueue.js       # localStorage pending action queue
    │   ├── patient/
    │   │   ├── pages/
    │   │   │   ├── Dashboard.jsx         # Hub + VoiceOnboarding entry
    │   │   │   ├── VoiceOnboarding.jsx   # Mic-tap voice symptom input
    │   │   │   ├── SmartConsultation.jsx # 4-step symptom → queue flow
    │   │   │   ├── Tokens.jsx            # Live queue status (survives refresh)
    │   │   │   ├── Chat.jsx / ChatList.jsx
    │   │   │   ├── Family.jsx
    │   │   │   ├── HealthRecords.jsx     # Cloudinary upload/download
    │   │   │   ├── Reminders.jsx
    │   │   │   ├── Settings.jsx
    │   │   │   └── ...
    │   │   ├── services/
    │   │   │   ├── queueService.js   # Supabase queue operations
    │   │   │   └── triage.js         # Symptom → specialization mapping
    │   │   └── hooks/
    │   │       └── useQueue.js       # Realtime queue hook (patient side)
    │   ├── doctor/
    │   │   ├── pages/
    │   │   │   ├── Queue.jsx             # Live queue + expandable patient cards
    │   │   │   ├── PostConsultation.jsx  # Post-call notes → Supabase
    │   │   │   ├── Dashboard.jsx
    │   │   │   ├── Onboarding.jsx
    │   │   │   ├── Patients.jsx          # Patient history + notes editor
    │   │   │   ├── Profile.jsx
    │   │   │   ├── Chat.jsx
    │   │   │   └── Inbox.jsx
    │   │   └── hooks/
    │   │       └── useDoctorQueue.js # Realtime queue hook (doctor side)
    │   ├── shared/
    │   │   ├── components/
    │   │   │   ├── ConsultationChat.jsx  # Full async chat (text/voice/video/files)
    │   │   │   ├── EmergencyHelp.jsx
    │   │   │   ├── LanguageSelector.jsx
    │   │   │   ├── LowBandwidthMode.jsx
    │   │   │   └── OfflineMode.jsx       # Flushes offline queue on reconnect
    │   │   └── services/
    │   │       ├── supabase.js
    │   │       ├── auth.js
    │   │       └── cloudinary.js
    │   ├── i18n/locales/             # en.json, hi.json, pa.json
    │   └── db/
    │       ├── schema.sql            # Supabase schema (queue tables)
    │       └── fix_rls.sql
    └── .env
```

---

## Database (Supabase — all tables)

### Auth & Users
| Table | Purpose |
|---|---|
| `accounts` | Login credentials (phone, PIN hash, role) |
| `app_patients` | Patient profiles per account (family members) |
| `user_settings` | Per-user preferences |

### Queue & Consultations
| Table | Purpose |
|---|---|
| `patients` | UUID patient records (used by queue system) |
| `doctors` | Doctor profiles with specialization, status, avg_consult_time |
| `tokens` | Queue tokens (priority, status, Jitsi room, ML/AI fields) |
| `symptoms` | Symptom submissions with ML predictions |
| `consultation_notes` | Doctor's post-call notes (diagnosis, prescription, follow-up) |

### Health Data
| Table | Purpose |
|---|---|
| `health_records` | Uploaded document metadata + Cloudinary URL |
| `medication_reminders` | Medication schedules |
| `consultations` | Consultation records with Jitsi room links |

### Messaging
| Table | Purpose |
|---|---|
| `consultation_messages` | Async chat messages (text, audio, video, documents) |

**Realtime enabled on:** `tokens`, `doctors`, `consultation_messages`

**RPC:** `find_best_doctor(target_spec)` — specialist routing with least-connections load balancing

---

## API Endpoints

### Main API — `http://localhost:5000`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/register` | — | Register (10/hr limit) |
| POST | `/api/login` | — | Login, returns JWT (20/min limit) |
| GET | `/api/health` | — | Health check |
| GET | `/api/patients` | ✓ | List patient/family profiles |
| POST | `/api/patients` | ✓ | Add family member |
| GET/POST | `/api/consultations` | ✓ | List / create consultations |
| GET | `/api/consultations/:id` | ✓ | Get consultation |
| POST | `/api/chat` | ✓ | AI chat (LM Studio → Gemini fallback) |
| POST | `/api/ai/symptom` | ✓ | AI symptom analysis (50/hr) |
| POST | `/api/ai/voice-analyze` | ✓ | Gemini voice transcript analysis (20/hr) |
| GET | `/api/health-records` | ✓ | List health records |
| POST | `/api/health-records` | ✓ | Upload file → Cloudinary, save URL |
| DELETE | `/api/health-records/:id` | ✓ | Delete record |
| GET | `/api/health-records/:id/download` | ✓ | Returns Cloudinary URL |
| GET/POST | `/api/medication-reminders` | ✓ | List / create reminders |
| PUT/DELETE | `/api/medication-reminders/:id` | ✓ | Update / delete reminder |
| GET/PUT | `/api/settings` | ✓ | User settings |
| GET | `/api/health-education` | — | Static health education content |
| GET | `/api/hospitals` | — | Nearby hospitals (?lat=&lng=) |
| GET | `/api/pharmacies` | — | Pharmacy list |
| GET | `/api/pharmacies/:id/stock` | — | Pharmacy stock |

### Disease Prediction API — `http://localhost:5001`

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/v1/model/status` | Model info |
| POST | `/api/v1/predict` | Predict disease from symptoms dict |
| POST | `/api/v1/train` | Retrain model (Bearer API key required) |

Predict request:
```json
{ "symptoms": { "fever": 1, "cough": 1, "fatigue": 0 } }
```

Supported symptoms: `fever`, `headache`, `fatigue`, `dizziness`, `cough`, `shortness_breath`, `sore_throat`, `runny_nose`, `nausea`, `vomiting`, `stomach_pain`, `diarrhea`, `joint_pain`, `muscle_pain`, `back_pain`, `swelling`, `rash`, `itching`, `dry_skin`, `wounds`

---

## Setup

### Prerequisites
- Node.js 16+
- Python 3.8+
- Supabase project (free tier works)
- Cloudinary account (free tier works)
- LM Studio (optional — Gemini is the fallback)

### Frontend
```bash
cd frontend/rishu-diital-chikitsak
npm install
npm run dev
# http://localhost:5173
```

### Backend
```bash
cd backend/chikitsak-backend
pip install -r requirements.txt

python app.py   # port 5000
python api.py   # port 5001
```

### Environment Variables

**`backend/chikitsak-backend/.env`**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key

CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
CLOUDINARY_URL=cloudinary://key:secret@cloud

JWT_SECRET=your-strong-random-secret

LMSTUDIO_URL=http://127.0.0.1:1234/v1/chat/completions
DEFAULT_MODEL=qwen3

# Gemini fallback — free key at https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_key
```

**`frontend/rishu-diital-chikitsak/.env`**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

VITE_CLOUDINARY_CLOUD_NAME=your_cloud
VITE_CLOUDINARY_API_KEY=your_key
VITE_CLOUDINARY_UPLOAD_PRESET=chikitsak_unsigned

VITE_API_URL=http://localhost:5000/api
VITE_PREDICTOR_URL=http://localhost:5001/api/v1
```

### Supabase Setup

Run these SQL files in your Supabase SQL editor in order:

1. `frontend/rishu-diital-chikitsak/src/db/schema.sql` — queue tables, enums, indexes, RLS, seed 10 doctors, `find_best_doctor` RPC
2. Then run this migration for app tables:

```sql
CREATE TABLE IF NOT EXISTS accounts (
  phone TEXT PRIMARY KEY, pin_hash TEXT NOT NULL,
  name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'patient',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_phone TEXT NOT NULL REFERENCES accounts(phone) ON DELETE CASCADE,
  name TEXT NOT NULL, age INTEGER, gender TEXT, blood_group TEXT,
  current_medications TEXT DEFAULT '', medical_history TEXT DEFAULT '',
  relation TEXT DEFAULT 'Self', patient_phone TEXT DEFAULT '',
  profile_image TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES app_patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL, record_type TEXT DEFAULT 'report',
  file_url TEXT, file_name TEXT, file_size TEXT,
  record_date DATE, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS medication_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES app_patients(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL, dosage TEXT NOT NULL,
  frequency TEXT DEFAULT 'once', time_slots JSONB,
  start_date DATE, end_date DATE, notes TEXT,
  active BOOLEAN DEFAULT true, last_taken TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_settings (
  account_phone TEXT PRIMARY KEY REFERENCES accounts(phone) ON DELETE CASCADE,
  language TEXT DEFAULT 'en', low_bandwidth_mode BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  medication_reminders_enabled BOOLEAN DEFAULT true,
  appointment_reminders BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES app_patients(id) ON DELETE CASCADE,
  doctor_phone TEXT, symptoms TEXT DEFAULT '',
  meeting_link TEXT, status TEXT DEFAULT 'pending',
  diagnosis TEXT, prescription TEXT, notes TEXT,
  follow_up_days INTEGER, severity TEXT DEFAULT 'mild',
  jitsi_room TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS consultation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID UNIQUE, doctor_id UUID, patient_id UUID,
  symptoms TEXT, diagnosis TEXT, prescription TEXT, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS consultation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID, patient_id UUID, doctor_id UUID,
  sender_role TEXT, message_type TEXT, content TEXT,
  duration INTEGER, file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read BOOLEAN DEFAULT false
);
-- RLS (open — Flask JWT handles auth)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_access" ON accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_access" ON app_patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_access" ON health_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_access" ON medication_reminders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_access" ON user_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_access" ON consultations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_access" ON consultation_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_access" ON consultation_messages FOR ALL USING (true) WITH CHECK (true);
-- Realtime
ALTER TABLE consultation_messages REPLICA IDENTITY FULL;
```

---

## Routes

### Patient
`/` · `/login` · `/register`  
`/patient` · `/patient/symptom-checker` · `/patient/tokens` · `/patient/book-doctor`  
`/patient/consultation/:id` · `/patient/pharmacy` · `/patient/family`  
`/patient/records` · `/patient/reminders` · `/patient/voice-assistance`  
`/patient/education` · `/patient/chats` · `/patient/chat/:doctorId` · `/patient/settings`

### Doctor
`/doctor` · `/doctor/onboarding` · `/doctor/queue` · `/doctor/tokens`  
`/doctor/patients` · `/doctor/profile` · `/doctor/consultation/:id`  
`/doctor/inbox` · `/doctor/chat/:patientId` · `/doctor/post-consultation/:tokenId`

---

## Demo Credentials

Register a new account at `/register` — old MySQL accounts no longer exist.

- Phone: any 10-digit number
- PIN: any 4-digit number
- Role: patient or doctor

For doctors: after login you'll be redirected to `/doctor/onboarding` to set up your specialization. The system has 10 pre-seeded online doctors for testing the queue.

---

## License
MIT
