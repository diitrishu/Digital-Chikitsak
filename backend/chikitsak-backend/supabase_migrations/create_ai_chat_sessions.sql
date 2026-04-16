-- ============================================================
-- Migration: Create ai_chat_sessions table
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================

-- source values: 'gemini', 'lmstudio', 'fallback'
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id        UUID        REFERENCES public.patients(id) ON DELETE SET NULL,
    user_message      TEXT        NOT NULL,
    ai_reply          TEXT        NOT NULL,
    symptoms_detected TEXT[]      DEFAULT '{}',
    is_emergency      BOOLEAN     DEFAULT FALSE,
    exchange_count    INTEGER     DEFAULT 1,
    source            TEXT        DEFAULT 'gemini',
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_patient_id
    ON public.ai_chat_sessions(patient_id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_created_at
    ON public.ai_chat_sessions(created_at DESC);

ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_insert_chat_sessions"
    ON public.ai_chat_sessions FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "allow_select_chat_sessions"
    ON public.ai_chat_sessions FOR SELECT
    USING (TRUE);
