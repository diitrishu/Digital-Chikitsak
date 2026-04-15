-- ============================================================
-- Digital Chikitsak — Smart Patient Queue & Triage System
-- Run this in Supabase SQL Editor (project: dgaurgpojceogqjsuiqw)
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────
CREATE TYPE doctor_status  AS ENUM ('online', 'in_call', 'offline', 'break');
CREATE TYPE token_status   AS ENUM ('waiting', 'in_consultation', 'done');
CREATE TYPE priority_level AS ENUM ('emergency', 'senior', 'child', 'general');

-- Specializations map to symptom categories
CREATE TYPE doctor_specialization AS ENUM (
  'general',          -- fever, fatigue, headache, dizziness
  'respiratory',      -- cough, shortness_breath, sore_throat, runny_nose
  'gastroenterology', -- nausea, vomiting, stomach_pain, diarrhea
  'orthopedics',      -- joint_pain, muscle_pain, back_pain, swelling
  'dermatology',      -- rash, itching, dry_skin, wounds
  'cardiology',       -- chest_pain + shortness_breath (emergency)
  'pediatrics',       -- age < 12
  'geriatrics'        -- age > 60
);

-- ── Tables ───────────────────────────────────────────────────

-- Patients (Supabase-native, UUID pk — separate from MySQL patients)
CREATE TABLE patients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  age        INTEGER,
  phone      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Doctors
CREATE TABLE doctors (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  specialization     doctor_specialization NOT NULL DEFAULT 'general',
  status             doctor_status NOT NULL DEFAULT 'offline',
  current_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  avg_consult_time   INTEGER NOT NULL DEFAULT 10, -- minutes per consultation
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tokens (queue entries)
CREATE TABLE tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_number INTEGER NOT NULL,
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id    UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  status       token_status   NOT NULL DEFAULT 'waiting',
  priority     priority_level NOT NULL DEFAULT 'general',
  jitsi_room   TEXT,           -- set when status = in_consultation
  symptoms_summary TEXT,       -- human-readable symptom list for doctor
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  called_at    TIMESTAMPTZ,
  UNIQUE (doctor_id, token_number)
);

-- Symptoms (one row per submission)
CREATE TABLE symptoms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  symptoms_json JSONB NOT NULL,
  ml_prediction TEXT,          -- JSON string: { disease, confidence, remedy, advise_doctor }
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX idx_tokens_doctor_status    ON tokens  (doctor_id, status, token_number);
CREATE INDEX idx_tokens_patient_status   ON tokens  (patient_id, status);
CREATE INDEX idx_doctors_status          ON doctors (status);
CREATE INDEX idx_doctors_specialization  ON doctors (specialization, status);

-- ── Realtime ─────────────────────────────────────────────────
ALTER TABLE tokens  REPLICA IDENTITY FULL;
ALTER TABLE doctors REPLICA IDENTITY FULL;

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Tokens: patients see own; doctors see their queue
-- Using open policies since auth is handled by Flask JWT (not Supabase Auth)
CREATE POLICY "tokens_select_all" ON tokens FOR SELECT USING (true);
CREATE POLICY "tokens_insert_all" ON tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "tokens_update_all" ON tokens FOR UPDATE USING (true);

-- Symptoms: open access (Flask JWT handles auth)
CREATE POLICY "symptoms_all" ON symptoms FOR ALL USING (true) WITH CHECK (true);

-- Doctors: anyone can read (for availability display); only self can update
CREATE POLICY "doctors_read_all"   ON doctors FOR SELECT USING (true);
CREATE POLICY "doctors_update_own" ON doctors FOR UPDATE USING (auth.uid() = id);

-- Patients: own data only
CREATE POLICY "patients_own" ON patients FOR ALL USING (auth.uid() = id);

-- Allow anon to insert/select patients by phone (used during token flow before Supabase Auth)
CREATE POLICY "patients_phone_access" ON patients
  FOR ALL USING (true) WITH CHECK (true);

-- ── Seed: Sample Doctors ─────────────────────────────────────
-- Run after creating the table to populate initial doctors
INSERT INTO doctors (name, specialization, status, avg_consult_time) VALUES
  ('Dr. Priya Sharma',   'general',          'online',  10),
  ('Dr. Rajesh Verma',   'respiratory',      'online',  12),
  ('Dr. Sunita Kaur',    'gastroenterology', 'online',  10),
  ('Dr. Amit Singh',     'orthopedics',      'online',  15),
  ('Dr. Meena Patel',    'dermatology',      'online',  8),
  ('Dr. Vikram Bose',    'cardiology',       'online',  20),
  ('Dr. Ananya Reddy',   'pediatrics',       'online',  10),
  ('Dr. Suresh Nair',    'geriatrics',       'online',  12),
  ('Dr. Kavita Joshi',   'general',          'online',  10),
  ('Dr. Arjun Mehta',    'respiratory',      'online',  12);

-- ============================================================
-- RPC: find_best_doctor
-- Single round-trip CTE query for specialist routing +
-- least-connections load balancing.
--
-- Usage: supabase.rpc('find_best_doctor', { target_spec: 'respiratory' })
-- ============================================================

CREATE OR REPLACE FUNCTION find_best_doctor(target_spec TEXT)
RETURNS TABLE (
  id                 UUID,
  name               TEXT,
  specialization     TEXT,
  avg_consult_time   INTEGER,
  waiting_count      BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH doctor_load AS (
    SELECT
      d.id,
      d.name,
      d.specialization::TEXT,
      d.avg_consult_time,
      COUNT(t.id) FILTER (WHERE t.status = 'waiting') AS waiting_count
    FROM doctors d
    LEFT JOIN tokens t ON d.id = t.doctor_id
    WHERE d.status = 'online'
    GROUP BY d.id
  )
  SELECT *
  FROM doctor_load
  WHERE specialization IN (target_spec, 'general')
  ORDER BY
    CASE WHEN specialization = target_spec THEN 0 ELSE 1 END,  -- exact match first
    waiting_count ASC,                                          -- least connections
    avg_consult_time ASC                                        -- faster doctor on tie
  LIMIT 1;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION find_best_doctor(TEXT) TO anon, authenticated;
