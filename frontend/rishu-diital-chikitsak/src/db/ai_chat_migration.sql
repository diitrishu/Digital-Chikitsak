-- ============================================================
-- AI Chat Sessions Table
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID REFERENCES patients(id) ON DELETE CASCADE,
  user_message      TEXT NOT NULL,
  ai_reply          TEXT NOT NULL,
  symptoms_detected TEXT[] DEFAULT '{}',
  is_emergency      BOOLEAN DEFAULT false,
  exchange_count    INTEGER DEFAULT 1,
  source            TEXT DEFAULT 'gemini',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chat_patient ON ai_chat_sessions (patient_id, created_at DESC);

ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_chat_all" ON ai_chat_sessions FOR ALL USING (true) WITH CHECK (true);

-- Also add missing columns to tokens table if not already added
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS diagnosis text;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS prescription text;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS severity text DEFAULT 'mild';
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS follow_up_days integer;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS ml_prediction text;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS ml_confidence float;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS voice_transcript text;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS symptoms_json jsonb;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS queue_position integer;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS estimated_wait integer;
