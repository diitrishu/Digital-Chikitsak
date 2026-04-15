# Digital Chikitsak

A telemedicine platform for rural healthcare in India. Multi-language (English, Hindi, Punjabi), voice-first symptom input, AI-powered triage, real-time doctor queue, and video consultations via Jitsi.

**No MySQL required.** All data is stored in Supabase. Fully deployed on Render.

---

## Live URLs

| Service | URL |
|---|---|
| Frontend | https://digital-chikitsak-frontend.onrender.com |
| Backend API | https://digital-chikitsak-backend.onrender.com |
| Health Check | https://digital-chikitsak-backend.onrender.com/api/health |

---

## What's Working

### Patient Flow
- **Voice Onboarding** — mic button on `/patient`. Patient taps, speaks symptoms in Hindi/Punjabi/English. Keyword extraction maps speech to 20 symptoms. Emergency phrases trigger immediate routing. Falls back to manual input if mic is denied. Interim words shown live.
- **Smart Consultation** — 4-step flow: describe symptoms (voice + text + quick-tap chips) → confirm detected symptoms + triage priority → ML disease prediction → live queue view
- **Token Queue** (`/patient/tokens`) — live queue position with Supabase Realtime updates. Survives page refresh. Shows Jitsi call link when it's your turn.
- **Book Doctor** — browse real registered doctors fetched from Supabase. Select time slot, confirm appointment. No mock data.
- **Pharmacy Finder** — locate nearby pharmacies, check medicine stock
- **Health Records** — upload documents (PDF, images, docs) to Cloudinary, view/download
- **Medication Reminders** — create and track medication schedules
- **Family Members** — manage health profiles for multiple family members
- **Health Education** — browse articles and videos by category
- **Voice Assistance** — voice-based health guidance
- **Chat** — async messaging with doctors (text, voice notes, video messages, file attachments via Cloudinary)
- **Settings** — account preferences synced to Supabase
- **Emergency Help** — one-tap access to ambulance (108), police (100), hospitals

### Doctor Flow
- **Onboarding** — 3-step setup: specialization → credentials → profile photo. Creates/updates doctor row in Supabase.
- **Dashboard** — stats (waiting / in-call / done today), recent patients, quick actions.
- **Queue** (`/doctor/queue`) — real-time patient queue via Supabase Realtime. Expandable patient cards with symptoms, ML prediction, AI summary, voice transcript, wait time. Status toggle: online / break / offline.
- **Call Patient** — generates Jitsi room, updates token to `in_consultation`, doctor status to `in_call`
- **Post-Consultation Notes** — after call: fill diagnosis, prescription, clinical notes, severity, follow-up days. Saves directly to Supabase `consultation_notes` and updates token with diagnosis/prescription. Resets doctor to online automatically.
- **Patients** — view all patients who consulted this doctor.
- **Profile** — edit specialization, qualification, experience, hospital, bio, languages, photo (Cloudinary)
- **Chat / Inbox** — async messaging with patients. All media via Cloudinary. Realtime updates.

### AI & ML
- **AI Symptom Chat** — tries LM Studio (local) first with 5s timeout, falls back to Gemini `gemini-2.0-flash` automatically
- **Voice Analysis** — Gemini analyzes voice transcript, returns structured summary in patient's language
- **Smart Doctor Routing** — `find_best_doctor` Supabase RPC matches symptoms to specialization, picks least-loaded online doctor

### Infrastructure
- **Deployed on Render** — backend (Python 3.11, gunicorn) + frontend (Vite static site)
- **Supabase only** — no MySQL. All app data in Supabase PostgreSQL
- **Supabase Realtime** — live queue updates on `tokens` and `doctors` tables; live chat on `consultation_messages`
- **Rate Limiting** — `flask-limiter` on auth (10/hr register, 20/min login) and AI endpoints
- **Cloudinary** — health record uploads, profile photos, voice notes, video messages
- **GeoJSON Hospital Data** — nearby hospital lookup from local files (no external API needed)
- **Offline queue** — pending actions saved to localStorage, flushed automatically when back online

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3, Framer Motion 7 |
| Routing | React Router v6 |
| State / Data | Supabase JS 2, Axios, React Hot Toast |
| i18n | i18next (en / hi / pa) |
| Backend | Flask 2.3, PyJWT, Flask-CORS, Flask-Limiter, Gunicorn |
| Database | Supabase PostgreSQL + Realtime |
| File Storage | Cloudinary |
| Video | Jitsi Meet |
| Cloud AI | Google Gemini 2.0 Flash |
| Hosting | Render (backend: web service, frontend: static site) |

---

## Project Structure

```
Digital-Chikitsak/
├── render.yaml                     # Render Blueprint — deploys both services
├── backend/chikitsak-backend/
│   ├── app.py                      # Main Flask API — Supabase only
│   ├── disease_predictor.py        # ML prediction engine
│   ├── train_model.py              # Model training script
│   ├── hospital_data.py            # GeoJSON hospital lookup
│   ├── supabase_client.py          # Supabase client (lazy singleton, service role key)
│   ├── cloudinary_client.py        # Cloudinary upload helpers
│   ├── models/disease_model.joblib
│   ├── data/hospitals.geojson
│   ├── requirements.txt
│   ├── runtime.txt                 # Python 3.11.9
│   ├── .env                        # Local secrets (gitignored)
│   └── .env.example                # Template — copy to .env
└── frontend/rishu-diital-chikitsak/
    ├── src/
    │   ├── router.jsx
    │   ├── App.jsx
    │   ├── patient/pages/
    │   │   ├── Dashboard.jsx
    │   │   ├── VoiceOnboarding.jsx
    │   │   ├── SmartConsultation.jsx
    │   │   ├── BookDoctor.jsx        # Real doctors from Supabase
    │   │   ├── Tokens.jsx
    │   │   ├── HealthRecords.jsx
    │   │   └── ...
    │   ├── doctor/pages/
    │   │   ├── Queue.jsx
    │   │   ├── PostConsultation.jsx  # Saves to Supabase directly
    │   │   ├── Onboarding.jsx
    │   │   └── ...
    │   ├── shared/services/
    │   │   ├── supabase.js
    │   │   ├── auth.js
    │   │   └── cloudinary.js
    │   └── i18n/locales/            # en.json, hi.json, pa.json
    ├── .env                         # Local secrets (gitignored)
    └── .env.example                 # Template — copy to .env
```

---

## Database (Supabase)

### Auth & Users
| Table | Purpose |
|---|---|
| `accounts` | Login credentials (phone, PIN hash, role) |
| `app_patients` | Patient profiles per account (family members) |
| `user_settings` | Per-user preferences |

### Queue & Consultations
| Table | Purpose |
|---|---|
| `doctors` | Doctor profiles — specialization, status, avg_consult_time, is_onboarded |
| `tokens` | Queue tokens — priority, status, Jitsi room, diagnosis, prescription |
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

> **Important:** Run this migration to add post-consultation fields to tokens:
> ```sql
> ALTER TABLE tokens
> ADD COLUMN IF NOT EXISTS diagnosis text,
> ADD COLUMN IF NOT EXISTS prescription text,
> ADD COLUMN IF NOT EXISTS severity text DEFAULT 'mild',
> ADD COLUMN IF NOT EXISTS follow_up_days integer;
> ```

---

## API Endpoints (Backend)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/register` | — | Register (10/hr limit) |
| POST | `/api/login` | — | Login, returns JWT (20/min limit) |
| GET | `/api/health` | — | Health check |
| GET | `/api/patients` | ✓ | List patient/family profiles |
| POST | `/api/patients` | ✓ | Add family member |
| GET/POST | `/api/consultations` | ✓ | List / create consultations |
| POST | `/api/chat` | ✓ | AI chat (LM Studio → Gemini fallback) |
| POST | `/api/ai/symptom` | ✓ | AI symptom analysis (50/hr) |
| GET | `/api/health-records` | ✓ | List health records |
| POST | `/api/health-records` | ✓ | Upload file → Cloudinary |
| DELETE | `/api/health-records/:id` | ✓ | Delete record |
| GET/POST | `/api/medication-reminders` | ✓ | List / create reminders |
| GET/PUT | `/api/settings` | ✓ | User settings |
| GET | `/api/hospitals` | — | Nearby hospitals (?lat=&lng=) |
| GET | `/api/pharmacies` | — | Pharmacy list |

---

## Deployment (Render)

The repo includes `render.yaml` which configures both services as a Blueprint.

### Deploy via Blueprint
1. Push repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → **New → Blueprint**
3. Connect `diitrishu/Digital-Chikitsak`
4. Fill in environment variables (see below)
5. Click **Apply**

### Backend Environment Variables (Render)
| Key | Value |
|---|---|
| `PYTHON_VERSION` | `3.11.9` |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Your Supabase **service role** key (not anon key) |
| `CLOUDINARY_URL` | `cloudinary://api_key:api_secret@cloud_name` |
| `JWT_SECRET` | Strong random string (32+ chars) |
| `GEMINI_API_KEY` | From https://aistudio.google.com/app/apikey |
| `FLASK_ENV` | `production` |
| `FLASK_DEBUG` | `False` |

### Frontend Environment Variables (Render)
| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase **anon/public** key |
| `VITE_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | `chikitsak_unsigned` |
| `VITE_API_URL` | `https://digital-chikitsak-backend.onrender.com/api` |

> **Note:** Frontend env vars are baked into the JS bundle at build time. After changing them, trigger a manual redeploy.

---

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase project
- Cloudinary account

### Frontend
```bash
cd frontend/rishu-diital-chikitsak
cp .env.example .env   # fill in your values
npm install
npm run dev
# http://localhost:5173
```

### Backend
```bash
cd backend/chikitsak-backend
cp .env.example .env   # fill in your values
pip install -r requirements.txt
python app.py          # http://localhost:5000
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
`/doctor` · `/doctor/onboarding` · `/doctor/queue`
`/doctor/patients` · `/doctor/profile` · `/doctor/consultation/:id`
`/doctor/inbox` · `/doctor/chat/:patientId` · `/doctor/post-consultation/:tokenId`

---

## Demo

Register a new account at `/register`:
- Phone: any valid 10-digit Indian number (starts with 6-9)
- PIN: any digits
- Role: `patient` or `doctor`

Doctors are redirected to `/doctor/onboarding` on first login to set up their profile. Once onboarded, they appear in the **Book Doctor** list for patients.

---

## License
MIT
