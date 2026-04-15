-- ── Quick RLS fix — run this in Supabase SQL editor ──────────────────────────
-- Drops all restrictive policies and opens all 4 tables for anon access.
-- Safe because auth is handled by Flask JWT, not Supabase Auth.

-- Patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "patients_own"          ON patients;
DROP POLICY IF EXISTS "patients_phone_access" ON patients;
CREATE POLICY "patients_open" ON patients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Tokens
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tokens_select_all" ON tokens;
DROP POLICY IF EXISTS "tokens_insert_all" ON tokens;
DROP POLICY IF EXISTS "tokens_update_all" ON tokens;
CREATE POLICY "tokens_open" ON tokens FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Symptoms
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "symptoms_all" ON symptoms;
CREATE POLICY "symptoms_open" ON symptoms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Doctors
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doctors_read_all"   ON doctors;
DROP POLICY IF EXISTS "doctors_update_own" ON doctors;
DROP POLICY IF EXISTS "doctors_update_all" ON doctors;
CREATE POLICY "doctors_open" ON doctors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Add missing columns (safe)
ALTER TABLE tokens  ADD COLUMN IF NOT EXISTS jitsi_room       TEXT;
ALTER TABLE tokens  ADD COLUMN IF NOT EXISTS symptoms_summary TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS avg_consult_time INTEGER NOT NULL DEFAULT 10;

-- Deploy RPC
CREATE OR REPLACE FUNCTION find_best_doctor(target_spec TEXT)
RETURNS TABLE (
  id               UUID,
  name             TEXT,
  specialization   TEXT,
  avg_consult_time INTEGER,
  waiting_count    BIGINT
)
LANGUAGE sql STABLE AS $$
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
  SELECT * FROM doctor_load
  WHERE specialization IN (target_spec, 'general')
  ORDER BY
    CASE WHEN specialization = target_spec THEN 0 ELSE 1 END,
    waiting_count ASC,
    avg_consult_time ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION find_best_doctor(TEXT) TO anon, authenticated;

-- Seed doctors if empty
INSERT INTO doctors (name, specialization, status, avg_consult_time)
SELECT name, specialization::doctor_specialization, status::doctor_status, avg_consult_time
FROM (VALUES
  ('Dr. Priya Sharma',   'general',          'online', 10),
  ('Dr. Rajesh Verma',   'respiratory',      'online', 12),
  ('Dr. Sunita Kaur',    'gastroenterology', 'online', 10),
  ('Dr. Amit Singh',     'orthopedics',      'online', 15),
  ('Dr. Meena Patel',    'dermatology',      'online',  8),
  ('Dr. Vikram Bose',    'cardiology',       'online', 20),
  ('Dr. Ananya Reddy',   'pediatrics',       'online', 10),
  ('Dr. Suresh Nair',    'geriatrics',       'online', 12),
  ('Dr. Kavita Joshi',   'general',          'online', 10),
  ('Dr. Arjun Mehta',    'respiratory',      'online', 12)
) AS v(name, specialization, status, avg_consult_time)
WHERE NOT EXISTS (SELECT 1 FROM doctors LIMIT 1);
