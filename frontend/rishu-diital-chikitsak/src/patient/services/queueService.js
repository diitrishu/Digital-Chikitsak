/**
 * Digital Chikitsak — Queue Service
 *
 * All queue operations go directly to Supabase.
 * Flask :5000 is auth-only. Flask :5001 is ML-only.
 *
 * Specialist Routing Algorithm:
 *   1. triage() determines required specialization from symptoms
 *   2. Find all online doctors with that specialization
 *   3. If none found, fall back to 'general' doctors
 *   4. Among matching doctors, apply Least Connections load balancing:
 *      → pick the doctor with fewest active 'waiting' tokens
 *      → tie-break: pick the one with lower avg_consult_time
 */

import { supabase } from '../../shared/services/supabase'

// Priority sort order — lower index = higher priority in queue
const PRIORITY_ORDER = { emergency: 0, senior: 1, child: 2, general: 3 }

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * @param {number} position
 * @param {number} avgConsultTime - minutes
 * @returns {number} estimated wait in minutes
 */
export function getEstimatedWait(position, avgConsultTime = 10) {
  return position * avgConsultTime
}

/**
 * @param {string} tokenId
 * @returns {string}
 */
export function getJitsiRoomId(tokenId) {
  return `chikitsak-${tokenId}`
}

/**
 * Sort tokens by priority then token_number.
 * @param {import('./types').TokenRecord[]} tokens
 * @returns {import('./types').TokenRecord[]}
 */
export function sortQueueTokens(tokens) {
  return [...tokens].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 3
    const pb = PRIORITY_ORDER[b.priority] ?? 3
    if (pa !== pb) return pa - pb
    return a.token_number - b.token_number
  })
}

/**
 * Least-connections load balancer among doctors of same specialization.
 * @param {{ id: string, avg_consult_time: number, waitingCount: number }[]} candidates
 * @returns {{ id: string, avg_consult_time: number } | null}
 */
export function selectBestDoctor(candidates) {
  if (!candidates || candidates.length === 0) return null
  return candidates.reduce((best, current) => {
    if (current.waitingCount < best.waitingCount) return current
    if (current.waitingCount === best.waitingCount &&
        current.avg_consult_time < best.avg_consult_time) return current
    return best
  })
}

// ── Async Supabase operations ─────────────────────────────────────────────────

/**
 * Generate a token for a patient.
 * Implements specialist routing + least-connections load balancing.
 *
 * @param {{ patientId: string, priority: string, specialization: string, symptomsSummary?: string }} params
 * @returns {Promise<import('./types').TokenRecord>}
 * @throws {{ code: 409 }} if patient already has active token
 * @throws {{ code: 503 }} if no doctors available
 */
export async function generateToken({ patientId, priority, specialization, symptomsSummary = '' }) {
  // ── Guard: one active token per patient ──────────────────────────────────
  const { data: existing, error: existErr } = await supabase
    .from('tokens')
    .select('id, status')
    .eq('patient_id', patientId)
    .in('status', ['waiting', 'in_consultation'])
    .maybeSingle()

  if (existErr) throw { code: 500, message: existErr.message }
  if (existing) throw { code: 409, message: 'You already have an active token. Please wait for your current consultation.' }

  // ── Find best doctor via specialist routing + load balancing ─────────────
  const doctor = await findBestDoctor(specialization)
  if (!doctor) throw { code: 503, message: 'No doctors are currently available. Please try again shortly.' }

  // ── Compute next token_number for this doctor ────────────────────────────
  const { data: maxRow } = await supabase
    .from('tokens')
    .select('token_number')
    .eq('doctor_id', doctor.id)
    .order('token_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const tokenNumber = maxRow ? maxRow.token_number + 1 : 1

  // ── Insert token ─────────────────────────────────────────────────────────
  const { data: token, error: insertErr } = await supabase
    .from('tokens')
    .insert({
      token_number: tokenNumber,
      patient_id: patientId,
      doctor_id: doctor.id,
      status: 'waiting',
      priority,
      symptoms_summary: symptomsSummary,
    })
    .select('*, doctors(name, specialization, avg_consult_time)')
    .single()

  if (insertErr) throw { code: 500, message: insertErr.message }
  return token
}

/**
 * Find the best available doctor for a given specialization.
 *
 * Uses a single Supabase RPC call that runs the CTE query:
 *
 *   WITH doctor_load AS (
 *     SELECT d.id, d.name, d.specialization, d.avg_consult_time,
 *            COUNT(t.id) FILTER (WHERE t.status = 'waiting') AS waiting_count
 *     FROM doctors d
 *     LEFT JOIN tokens t ON d.id = t.doctor_id
 *     WHERE d.status = 'online'
 *     GROUP BY d.id
 *   )
 *   SELECT * FROM doctor_load
 *   WHERE specialization IN ($1, 'general')   -- specialist first, general as fallback
 *   ORDER BY
 *     CASE WHEN specialization = $1 THEN 0 ELSE 1 END,  -- prefer exact match
 *     waiting_count ASC,
 *     avg_consult_time ASC
 *   LIMIT 1;
 *
 * Falls back to client-side logic if RPC is not available.
 *
 * @param {string} specialization
 * @returns {Promise<{ id: string, avg_consult_time: number } | null>}
 */
export async function findBestDoctor(specialization) {
  // Try RPC first (single round-trip, uses CTE)
  // RPC returns a TABLE — result is an array, take first element
  try {
    const { data, error } = await supabase.rpc('find_best_doctor', { target_spec: specialization })
    if (!error && Array.isArray(data) && data.length > 0) return data[0]
    if (!error && data && !Array.isArray(data)) return data
  } catch (_) {
    // RPC not deployed — fall through to client-side logic
  }

  // Client-side fallback: fetch online doctors + count waiting tokens per doctor
  const { data: onlineDoctors, error } = await supabase
    .from('doctors')
    .select('id, name, specialization, avg_consult_time')
    .eq('status', 'online')

  if (error || !onlineDoctors || onlineDoctors.length === 0) return null

  // STEP 1: exact specialization match
  let candidates = onlineDoctors.filter(d => d.specialization === specialization)

  // STEP 2: fallback to general if no specialist online
  if (candidates.length === 0 && specialization !== 'general') {
    candidates = onlineDoctors.filter(d => d.specialization === 'general')
  }

  // STEP 3: last resort — any online doctor
  if (candidates.length === 0) candidates = onlineDoctors
  if (candidates.length === 0) return null

  // Least-connections: count waiting tokens per candidate in parallel
  const withCounts = await Promise.all(
    candidates.map(async (doc) => {
      const { count } = await supabase
        .from('tokens')
        .select('id', { count: 'exact', head: true })
        .eq('doctor_id', doc.id)
        .eq('status', 'waiting')
      return { ...doc, waitingCount: count ?? 0 }
    })
  )

  return selectBestDoctor(withCounts)
}

/**
 * Get a patient's position in the queue and estimated wait time.
 *
 * @param {{ tokenId: string, doctorId: string, myTokenNumber: number }} params
 * @returns {Promise<{ position: number, estimatedWait: number, status: string }>}
 */
export async function getQueuePosition({ tokenId, doctorId, myTokenNumber }) {
  // Get current token status
  const { data: myToken } = await supabase
    .from('tokens')
    .select('status')
    .eq('id', tokenId)
    .single()

  if (!myToken) return { position: 0, estimatedWait: 0, status: 'unknown' }
  if (myToken.status === 'done') return { position: 0, estimatedWait: 0, status: 'done' }
  if (myToken.status === 'in_consultation') return { position: 0, estimatedWait: 0, status: 'in_consultation' }

  // Count tokens ahead in queue
  const { count } = await supabase
    .from('tokens')
    .select('id', { count: 'exact', head: true })
    .eq('doctor_id', doctorId)
    .eq('status', 'waiting')
    .lt('token_number', myTokenNumber)

  // Get doctor's avg_consult_time
  const { data: doctor } = await supabase
    .from('doctors')
    .select('avg_consult_time')
    .eq('id', doctorId)
    .single()

  const position = count ?? 0
  const avgTime = doctor?.avg_consult_time ?? 10
  return {
    position,
    estimatedWait: getEstimatedWait(position, avgTime),
    status: 'waiting',
  }
}

/**
 * Get the full queue for a doctor (waiting tokens, priority-sorted).
 *
 * @param {string} doctorId
 * @returns {Promise<import('./types').TokenRecord[]>}
 */
export async function getDoctorQueue(doctorId) {
  const { data, error } = await supabase
    .from('tokens')
    .select('*, patients(name, age, phone)')
    .eq('doctor_id', doctorId)
    .eq('status', 'waiting')
    .order('token_number', { ascending: true })

  if (error) throw { code: 500, message: error.message }
  return sortQueueTokens(data || [])
}

/**
 * Doctor calls the next patient.
 * Picks highest-priority, lowest-token_number waiting token.
 * Sets token → in_consultation, doctor → in_call.
 *
 * @param {string} doctorId
 * @returns {Promise<import('./types').TokenRecord>}
 * @throws {{ code: 404 }} if no patients waiting
 */
export async function callNext(doctorId) {
  const queue = await getDoctorQueue(doctorId)
  if (queue.length === 0) throw { code: 404, message: 'No patients waiting in queue.' }

  const next = queue[0] // already priority+token_number sorted
  const jitsiRoom = getJitsiRoomId(next.id)

  const { data: updatedToken, error: tokenErr } = await supabase
    .from('tokens')
    .update({
      status: 'in_consultation',
      called_at: new Date().toISOString(),
      jitsi_room: jitsiRoom,
    })
    .eq('id', next.id)
    .select()
    .single()

  if (tokenErr) throw { code: 500, message: tokenErr.message }

  const { error: doctorErr } = await supabase
    .from('doctors')
    .update({
      status: 'in_call',
      current_patient_id: next.patient_id,
    })
    .eq('id', doctorId)

  if (doctorErr) throw { code: 500, message: doctorErr.message }

  return updatedToken
}

/**
 * Doctor marks consultation as done.
 * Sets token → done, doctor → online, clears current_patient_id.
 * Idempotent: safe to call twice.
 *
 * @param {string} tokenId
 * @param {string} doctorId
 * @returns {Promise<void>}
 */
export async function markDone(tokenId, doctorId) {
  const { error: tokenErr } = await supabase
    .from('tokens')
    .update({ status: 'done' })
    .eq('id', tokenId)

  if (tokenErr) throw { code: 500, message: tokenErr.message }

  const { error: doctorErr } = await supabase
    .from('doctors')
    .update({ status: 'online', current_patient_id: null })
    .eq('id', doctorId)

  if (doctorErr) throw { code: 500, message: doctorErr.message }
}

/**
 * Update a doctor's availability status.
 *
 * @param {string} doctorId
 * @param {'online'|'offline'|'break'} status
 * @returns {Promise<void>}
 */
export async function updateDoctorStatus(doctorId, status) {
  const { error } = await supabase
    .from('doctors')
    .update({ status })
    .eq('id', doctorId)

  if (error) throw { code: 500, message: error.message }
}

/**
 * Get all online doctors grouped by specialization.
 * Used by SymptomEntry to check instant availability.
 *
 * @returns {Promise<import('./types').DoctorRecord[]>}
 */
export async function getOnlineDoctors() {
  const { data, error } = await supabase
    .from('doctors')
    .select('id, name, specialization, status, avg_consult_time')
    .eq('status', 'online')

  if (error) return []
  return data || []
}
