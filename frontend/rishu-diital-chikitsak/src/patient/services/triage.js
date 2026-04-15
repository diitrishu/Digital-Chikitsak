/**
 * Digital Chikitsak — Triage & Specialist Routing Engine (v2)
 *
 * Pure functions only — no imports, no side effects, no network calls.
 * Runs synchronously BEFORE any async work (ML API, Supabase).
 *
 * Algorithm (3-step, deterministic):
 *   STEP 1 — Hard rule overrides  (emergency, age-based)
 *   STEP 2 — Weighted symptom scoring  (multi-symptom conflicts resolved)
 *   STEP 3 — Default fallback  (general)
 */

// ── STEP 2: Weighted symptom → specialization scores ─────────────────────────
// Higher weight = stronger signal for that specialization.
// Symptoms with weight 4 are highly specific; weight 1 is weak/shared.
const SYMPTOM_WEIGHTS = {
  fever:            { general: 2 },
  headache:         { general: 2 },
  fatigue:          { general: 1 },
  dizziness:        { general: 1 },
  cough:            { respiratory: 3 },
  shortness_breath: { respiratory: 4 },
  sore_throat:      { respiratory: 2 },
  runny_nose:       { respiratory: 2 },
  nausea:           { gastroenterology: 3 },
  vomiting:         { gastroenterology: 3 },
  stomach_pain:     { gastroenterology: 4 },
  diarrhea:         { gastroenterology: 4 },
  joint_pain:       { orthopedics: 3 },
  muscle_pain:      { orthopedics: 3 },
  back_pain:        { orthopedics: 3 },
  swelling:         { orthopedics: 2 },
  rash:             { dermatology: 4 },
  itching:          { dermatology: 3 },
  dry_skin:         { dermatology: 2 },
  wounds:           { dermatology: 3 },
  // chest_pain handled by hard rule — not in weights table
}

/**
 * selectDoctorSpecialization — Final production-grade routing function.
 *
 * STEP 1: Hard rule overrides (emergency + age)
 * STEP 2: Weighted scoring across all symptoms
 * STEP 3: Default fallback to 'general'
 *
 * @param {string[]} symptoms - array of symptom keys (lowercase)
 * @param {number} age - patient age
 * @returns {{ specialization: string, priority: string, reason: string }}
 */
export function selectDoctorSpecialization(symptoms, age) {
  const s = new Set(symptoms.map(x => x.toLowerCase()))

  // ── STEP 1: Hard rule overrides ───────────────────────────────────────────

  // Emergency: chest pain + breathlessness → cardiology, always
  if (s.has('chest_pain') && s.has('shortness_breath')) {
    return { specialization: 'cardiology', priority: 'emergency', reason: 'Chest pain + breathlessness' }
  }

  // Age-based override (before scoring — age is a hard clinical rule)
  if (typeof age === 'number' && age < 12) {
    return { specialization: 'pediatrics', priority: 'child', reason: 'Age < 12' }
  }
  if (typeof age === 'number' && age > 60) {
    return { specialization: 'geriatrics', priority: 'senior', reason: 'Age > 60' }
  }

  // ── STEP 2: Weighted scoring ──────────────────────────────────────────────
  const scores = {}
  for (const sym of s) {
    const specWeights = SYMPTOM_WEIGHTS[sym]
    if (specWeights) {
      for (const [spec, weight] of Object.entries(specWeights)) {
        scores[spec] = (scores[spec] || 0) + weight
      }
    }
  }

  // ── STEP 3: Default fallback ──────────────────────────────────────────────
  if (Object.keys(scores).length === 0) {
    return { specialization: 'general', priority: 'general', reason: 'No strong symptom match' }
  }

  // Pick highest score; tie-break is deterministic (reduce keeps first max)
  const bestSpec = Object.keys(scores).reduce((a, b) => scores[a] >= scores[b] ? a : b)

  return { specialization: bestSpec, priority: 'general', reason: 'Highest symptom score' }
}

/**
 * triagePriority — Assigns clinical priority level.
 * NEVER delegated to ML — always rule-based.
 * Rules evaluated in order; first match wins.
 *
 * @param {string[]} symptoms
 * @param {number} age
 * @returns {{ priority: 'emergency'|'senior'|'child'|'general', severity: 'critical'|'high'|'normal' }}
 */
export function triagePriority(symptoms, age) {
  // Rule 1: Cardiac/respiratory emergency
  if (symptoms.includes('chest_pain') && symptoms.includes('shortness_breath')) {
    return { priority: 'emergency', severity: 'critical' }
  }

  // Rule 2: Severe respiratory distress (fever + cough + breathlessness)
  if (symptoms.includes('shortness_breath') && symptoms.includes('cough') && symptoms.includes('fever')) {
    return { priority: 'emergency', severity: 'critical' }
  }

  // Rule 3: Senior citizen
  if (typeof age === 'number' && age > 60) {
    return { priority: 'senior', severity: 'high' }
  }

  // Rule 4: Child
  if (typeof age === 'number' && age < 12) {
    return { priority: 'child', severity: 'high' }
  }

  return { priority: 'general', severity: 'normal' }
}

/**
 * triage — Main export. Combines priority + specialization routing.
 * Used by SymptomEntry component.
 *
 * @param {{ symptoms: string[], age: number }} input
 * @returns {{
 *   priority: 'emergency'|'senior'|'child'|'general',
 *   severity: 'critical'|'high'|'normal',
 *   specialization: string,
 *   reason: string,
 *   reasoning: string
 * }}
 */
export function triage({ symptoms, age }) {
  const { priority, severity } = triagePriority(symptoms, age)
  const { specialization, reason } = selectDoctorSpecialization(symptoms, age)

  const SPEC_LABELS = {
    general:          'General Physician',
    respiratory:      'Respiratory Specialist',
    gastroenterology: 'Gastroenterologist',
    orthopedics:      'Orthopedic Specialist',
    dermatology:      'Dermatologist',
    cardiology:       'Cardiologist',
    pediatrics:       'Pediatrician',
    geriatrics:       'Geriatric Specialist',
  }

  let reasoning = ''
  if (priority === 'emergency') {
    reasoning = `Emergency — routing to ${SPEC_LABELS[specialization] || specialization} immediately`
  } else if (priority === 'senior') {
    reasoning = `Senior patient (age ${age}) — priority queue → ${SPEC_LABELS[specialization] || specialization}`
  } else if (priority === 'child') {
    reasoning = `Child patient (age ${age}) → ${SPEC_LABELS[specialization] || specialization}`
  } else {
    reasoning = `${reason} → ${SPEC_LABELS[specialization] || specialization}`
  }

  return { priority, severity, specialization, reason, reasoning }
}

/**
 * extractSymptoms — Parse free text (Punjabi / Hindi / English) into symptom keys.
 * Used by SymptomEntry to convert voice/text input into structured array.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function extractSymptoms(text) {
  if (!text || typeof text !== 'string') return []
  const lower = text.toLowerCase()

  const KEYWORD_MAP = {
    fever:            ['fever', 'temperature', 'bukhar', 'ਬੁਖਾਰ', 'बुखार'],
    headache:         ['headache', 'head pain', 'sir dard', 'ਸਿਰ ਦਰਦ', 'सिर दर्द'],
    fatigue:          ['fatigue', 'tired', 'weakness', 'thakaan', 'ਥਕਾਵਟ', 'थकान'],
    dizziness:        ['dizzy', 'dizziness', 'chakkar', 'ਚੱਕਰ', 'चक्कर'],
    cough:            ['cough', 'khansi', 'ਖੰਘ', 'खांसी'],
    shortness_breath: ['shortness of breath', 'breathing difficulty', 'breathless', 'saans', 'ਸਾਹ ਫੁੱਲਣਾ', 'सांस'],
    sore_throat:      ['sore throat', 'throat pain', 'gala', 'ਗਲੇ ਵਿੱਚ ਦਰਦ', 'गला'],
    runny_nose:       ['runny nose', 'naak', 'ਨੱਕ ਵਗਣਾ', 'नाक'],
    nausea:           ['nausea', 'nauseous', 'ji michlaana', 'ਜੀ ਮਿਚਲਾਉਣਾ', 'मतली'],
    vomiting:         ['vomit', 'vomiting', 'ulti', 'ਉਲਟੀ', 'उल्टी'],
    stomach_pain:     ['stomach pain', 'stomach ache', 'pet dard', 'ਪੇਟ ਦਰਦ', 'पेट दर्द'],
    diarrhea:         ['diarrhea', 'loose motion', 'dast', 'ਦਸਤ', 'दस्त'],
    joint_pain:       ['joint pain', 'joron ka dard', 'ਜੋੜਾਂ ਦਾ ਦਰਦ', 'जोड़ों का दर्द'],
    muscle_pain:      ['muscle pain', 'body ache', 'maasphesi', 'ਮਾਸਪੇਸ਼ੀ ਦਰਦ', 'मांसपेशी'],
    back_pain:        ['back pain', 'pith dard', 'ਪਿੱਠ ਦਰਦ', 'पीठ दर्द'],
    swelling:         ['swelling', 'soj', 'ਸੋਜ', 'सूजन'],
    rash:             ['rash', 'skin rash', 'daag', 'ਖੁਜਲੀ ਵਾਲੇ ਦਾਗ', 'दाग'],
    itching:          ['itch', 'itching', 'khujli', 'ਖੁਜਲੀ', 'खुजली'],
    dry_skin:         ['dry skin', 'sukhi chamdi', 'ਸੁੱਕੀ ਚਮੜੀ', 'सूखी त्वचा'],
    wounds:           ['wound', 'cut', 'injury', 'zakham', 'ਜ਼ਖਮ', 'जख्म'],
    chest_pain:       ['chest pain', 'chest ache', 'seene mein dard', 'ਛਾਤੀ ਵਿੱਚ ਦਰਦ', 'सीने में दर्द'],
  }

  const found = new Set()
  for (const [symptomKey, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) { found.add(symptomKey); break }
    }
  }
  return Array.from(found)
}

/**
 * symptomsToMLPayload — Convert symptom array to binary dict for ML API.
 * ML API expects: { fever: 1, cough: 0, ... }
 *
 * @param {string[]} symptoms
 * @returns {Object.<string, 0|1>}
 */
export function symptomsToMLPayload(symptoms) {
  const ALL = [
    'fever','headache','fatigue','dizziness','cough','shortness_breath',
    'sore_throat','runny_nose','nausea','vomiting','stomach_pain','diarrhea',
    'joint_pain','muscle_pain','back_pain','swelling','rash','itching',
    'dry_skin','wounds',
  ]
  const result = {}
  for (const s of ALL) result[s] = symptoms.includes(s) ? 1 : 0
  return result
}
