import { supabase } from 'src/services/supabase';

const PRIORITY_ORDER = { emergency: 0, senior: 1, child: 2, general: 3 };

export function getEstimatedWait(position, avgConsultTime = 10) {
  return position * avgConsultTime;
}

export function getJitsiRoomId(tokenId) {
  return `chikitsak-${tokenId}`;
}

export function sortQueueTokens(tokens) {
  return [...tokens].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 3;
    const pb = PRIORITY_ORDER[b.priority] ?? 3;
    if (pa !== pb) return pa - pb;
    return a.token_number - b.token_number;
  });
}

export function selectBestDoctor(candidates) {
  if (!candidates || candidates.length === 0) return null;
  return candidates.reduce((best, current) => {
    if (current.waitingCount < best.waitingCount) return current;
    if (current.waitingCount === best.waitingCount &&
        current.avg_consult_time < best.avg_consult_time) return current;
    return best;
  });
}

export async function findBestDoctor(specialization) {
  // Try online doctors with matching specialization first
  let { data: candidates } = await supabase
    .from('doctors')
    .select('id, name, specialization, avg_consult_time, status')
    .eq('status', 'online');

  if (!candidates || candidates.length === 0) {
    // Fallback: get any doctor so foreign keys don't fail
    const { data: any } = await supabase
      .from('doctors')
      .select('id, name, specialization, avg_consult_time, status')
      .limit(5);
    candidates = any || [];
  }

  if (candidates.length === 0) return null;

  // Prefer matching specialization, then general, then any
  let filtered = candidates.filter(d => d.specialization === specialization);
  if (filtered.length === 0) filtered = candidates.filter(d => d.specialization === 'general');
  if (filtered.length === 0) filtered = candidates;

  const withCounts = await Promise.all(
    filtered.map(async (doc) => {
      const { count } = await supabase
        .from('tokens').select('id', { count: 'exact', head: true })
        .eq('doctor_id', doc.id).eq('status', 'waiting');
      return { ...doc, waitingCount: count ?? 0 };
    })
  );

  return selectBestDoctor(withCounts);
}

export async function generateToken({ patientId, priority, specialization, symptomsSummary = '' }) {
  const { data: existing, error: existErr } = await supabase
    .from('tokens').select('id, status').eq('patient_id', patientId)
    .in('status', ['waiting', 'in_consultation']).maybeSingle();

  if (existErr) throw { code: 500, message: existErr.message };
  if (existing) throw { code: 409, message: 'You already have an active token.' };

  const doctor = await findBestDoctor(specialization);
  if (!doctor) throw { code: 503, message: 'No doctors available right now.' };

  const { data: maxRow } = await supabase
    .from('tokens').select('token_number').eq('doctor_id', doctor.id)
    .order('token_number', { ascending: false }).limit(1).maybeSingle();

  const tokenNumber = maxRow ? maxRow.token_number + 1 : 1;

  const { data: token, error: insertErr } = await supabase
    .from('tokens').insert({
      token_number: tokenNumber, patient_id: patientId, doctor_id: doctor.id,
      status: 'waiting', priority, symptoms_summary: symptomsSummary,
    }).select('*, doctors(name, specialization, avg_consult_time)').single();

  if (insertErr) throw { code: 500, message: insertErr.message };
  return token;
}

export async function getOnlineDoctors() {
  const { data, error } = await supabase
    .from('doctors').select('id, name, specialization, status, avg_consult_time').eq('status', 'online');
  if (error) return [];
  return data || [];
}

export async function markDone(tokenId, doctorId) {
  await supabase.from('tokens').update({ status: 'done' }).eq('id', tokenId);
  await supabase.from('doctors').update({ status: 'online', current_patient_id: null }).eq('id', doctorId);
}
