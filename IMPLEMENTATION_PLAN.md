# Digital Chikitsak — Complete Implementation Plan
**For AI IDE (Cursor / Windsurf / Copilot) — Zero Ambiguity Version**

---

## CRITICAL RULE FOR AI IDE
Read this entire file before touching any code.
- Never modify a file that is not listed in the task you are working on.
- Every task has EXACT file paths, EXACT function names, EXACT variable names.
- Do not rename, refactor, or "improve" existing code unless explicitly instructed.
- Each task is self-contained. Complete one task fully before starting the next.

---

## WHAT ALREADY WORKS (DO NOT TOUCH)
- Authentication: phone + PIN, JWT, roles — `backend/chikitsak-backend/app.py`
- Supabase Realtime on `tokens` and `doctors` tables — `frontend/src/db/schema.sql`
- `find_best_doctor(target_spec)` RPC — Supabase
- Disease Prediction API — `backend/chikitsak-backend/api.py` port 5001
- Jitsi Meet video call room generation — `doctor/pages/Queue.jsx` (partial)
- i18next multilingual — `src/i18n/locales/en.json`, `hi.json`, `pa.json`
- Cloudinary file upload — `backend/chikitsak-backend/cloudinary_client.py`
- GeoJSON hospital lookup — `backend/chikitsak-backend/hospital_data.py`

---

## ARCHITECTURE OVERVIEW

```
Patient opens app
    ↓
[TASK 1] Dashboard loads → Voice mic opens automatically → patient speaks symptoms
    ↓
Voice transcript → Gemini API (backend) → structured symptom JSON
    ↓
ML prediction (api.py port 5001) → disease + confidence + priority
    ↓
[TASK 2] All analysis shown on screen BEFORE patient touches anything
    ↓
Patient confirms → find_best_doctor() RPC called
    ↓
[TASK 3] If doctor ONLINE → instant Jitsi call
         If doctor BUSY  → token issued → queue with live position
    ↓
[TASK 4] Doctor dashboard shows patient info card BEFORE calling
    ↓
Video call → [TASK 5] Doctor fills post-consultation notes → token closed
    ↓
[TASK 6] LM Studio fallback → Gemini API if LM Studio unreachable
```

---

## TASK 1 — Voice-First Patient Dashboard

### What to build
When patient opens `/patient` (Dashboard), the FIRST thing they see is an auto-activated voice input screen. No manual navigation to symptom checker. Voice runs → analysis appears → THEN patient proceeds.

### Files to create/modify

**CREATE: `frontend/rishu-diital-chikitsak/src/patient/pages/VoiceOnboarding.jsx`**

This is a NEW component. It is NOT the existing VoiceChat.jsx.
Do NOT modify VoiceChat.jsx.

```jsx
// VoiceOnboarding.jsx
// Full file content:

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import axios from 'axios'

const SYMPTOM_KEYWORDS = {
  en: {
    fever: ['fever', 'temperature', 'hot', 'burning'],
    headache: ['headache', 'head pain', 'migraine', 'head ache'],
    fatigue: ['tired', 'fatigue', 'weakness', 'weak', 'exhausted'],
    dizziness: ['dizzy', 'dizziness', 'vertigo', 'spinning'],
    cough: ['cough', 'coughing', 'cough up'],
    shortness_breath: ['breath', 'breathing', 'breathless', 'short of breath', 'cant breathe'],
    sore_throat: ['throat', 'sore throat', 'throat pain'],
    runny_nose: ['runny nose', 'nose', 'sneezing', 'nasal'],
    nausea: ['nausea', 'nauseous', 'sick feeling'],
    vomiting: ['vomiting', 'vomit', 'throwing up'],
    stomach_pain: ['stomach', 'stomach pain', 'abdomen', 'belly pain', 'tummy'],
    diarrhea: ['diarrhea', 'loose motion', 'loose stool'],
    joint_pain: ['joint pain', 'joints', 'joint ache'],
    muscle_pain: ['muscle pain', 'muscles', 'body pain', 'body ache'],
    back_pain: ['back pain', 'back ache', 'spine'],
    swelling: ['swelling', 'swollen', 'swell'],
    rash: ['rash', 'skin rash', 'eruption'],
    itching: ['itch', 'itching', 'scratching'],
    dry_skin: ['dry skin', 'skin dry'],
    wounds: ['wound', 'cut', 'injury', 'bleeding']
  },
  hi: {
    fever: ['bukhaar', 'bukhar', 'tez bukhaar', 'garmi', 'bokhaar'],
    headache: ['sar dard', 'sir dard', 'sar mein dard', 'sir mein dard'],
    fatigue: ['kamzori', 'thakan', 'thaka', 'bimaar'],
    dizziness: ['chakkar', 'chakker', 'sar ghoomna'],
    cough: ['khansi', 'khaansi', 'khas'],
    shortness_breath: ['saans', 'saans lene mein takleef', 'dam ghutna'],
    sore_throat: ['gala dard', 'gale mein dard', 'gala kharab'],
    runny_nose: ['naak bahna', 'naak bana', 'chheenk', 'nazla'],
    nausea: ['ulti jaisi', 'ji machlana', 'matli'],
    vomiting: ['ulti', 'ultee', 'qay'],
    stomach_pain: ['pet dard', 'pait dard', 'peth dard', 'pet mein dard'],
    diarrhea: ['dast', 'daast', 'loose motion', 'patlaa potty'],
    joint_pain: ['jodo mein dard', 'jod dard'],
    muscle_pain: ['maaaspeshan mein dard', 'body dard', 'badan dard'],
    back_pain: ['kamar dard', 'peeth dard'],
    swelling: ['sujan', 'soojan'],
    rash: ['daane', 'kharish', 'chechak jaisi'],
    itching: ['kharish', 'khujli', 'khujlee'],
    dry_skin: ['rookhi twacha', 'dry skin'],
    wounds: ['ghav', 'chot', 'zakhm', 'khoon']
  },
  pa: {
    fever: ['bukhar', 'tapp', 'garmi'],
    headache: ['sir dard', 'sar dard'],
    fatigue: ['kamzori', 'thakaan'],
    dizziness: ['chakkar'],
    cough: ['khansi', 'khaasi'],
    shortness_breath: ['sah lena', 'sans di takleef'],
    sore_throat: ['gala dard', 'gale di takleef'],
    runny_nose: ['naak bahna', 'peenaa naak'],
    nausea: ['ulti jaisi', 'ji machlana'],
    vomiting: ['ulti', 'kaa'],
    stomach_pain: ['pet dard', 'dhabaa dard'],
    diarrhea: ['dast', 'loose motion'],
    joint_pain: ['jod dard'],
    muscle_pain: ['body dard', 'badan dard'],
    back_pain: ['kamar dard', 'peeth dard'],
    swelling: ['sujan'],
    rash: ['daane', 'kharash'],
    itching: ['khujli', 'kharish'],
    dry_skin: ['sukkhi twacha'],
    wounds: ['ghav', 'chot']
  }
}

// Parse transcript and return symptoms object matching api.py format
function parseTranscriptToSymptoms(transcript, lang = 'en') {
  const lower = transcript.toLowerCase()
  const keywords = SYMPTOM_KEYWORDS[lang] || SYMPTOM_KEYWORDS.en
  const detected = {}
  
  // Initialize all 20 symptoms to 0
  const allSymptoms = [
    'fever','headache','fatigue','dizziness','cough','shortness_breath',
    'sore_throat','runny_nose','nausea','vomiting','stomach_pain','diarrhea',
    'joint_pain','muscle_pain','back_pain','swelling','rash','itching',
    'dry_skin','wounds'
  ]
  allSymptoms.forEach(s => { detected[s] = 0 })
  
  Object.entries(keywords).forEach(([symptom, words]) => {
    if (words.some(word => lower.includes(word))) {
      detected[symptom] = 1
    }
  })
  
  return detected
}

// Emergency keywords — if found, set priority to emergency immediately
const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'stroke', 'unconscious', 'cant breathe',
  'severe bleeding', 'paralysis', 'seizure', 'fitting',
  'sine dard', 'dil ka dauraa', 'behoshi', 'zyaada khoon',
  'seene mein dard', 'sans nahi', 'hosh nahi'
]

function checkEmergency(transcript) {
  const lower = transcript.toLowerCase()
  return EMERGENCY_KEYWORDS.some(kw => lower.includes(kw))
}

export default function VoiceOnboarding() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const lang = i18n.language || 'en'
  
  const [phase, setPhase] = useState('listening') 
  // phases: 'listening' | 'processing' | 'result' | 'fallback'
  
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [micError, setMicError] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  // analysisResult shape: { symptoms: {}, prediction: '', confidence: 0, priority: '', summary: '' }
  
  const recognitionRef = useRef(null)
  const timeoutRef = useRef(null)
  
  // Auto-start voice on mount
  useEffect(() => {
    const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    if (!supported) {
      setMicError(true)
      setPhase('fallback')
      return
    }
    startListening()
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])
  
  const langMap = { en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN' }
  
  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = langMap[lang] || 'hi-IN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    
    recognition.onstart = () => setIsListening(true)
    
    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + ' '
        } else {
          interimText += event.results[i][0].transcript
        }
      }
      if (finalText) {
        setTranscript(prev => prev + finalText)
        // Auto-stop after 3 seconds of silence (handled by timeout reset)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          recognition.stop()
        }, 3000)
      }
    }
    
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setMicError(true)
        setPhase('fallback')
      }
      setIsListening(false)
    }
    
    recognition.onend = () => {
      setIsListening(false)
      // Only process if we have transcript
      setTranscript(prev => {
        if (prev.trim().length > 3) {
          processTranscript(prev)
        }
        return prev
      })
    }
    
    recognitionRef.current = recognition
    recognition.start()
  }
  
  async function processTranscript(text) {
    setPhase('processing')
    
    const isEmergency = checkEmergency(text)
    if (isEmergency) {
      // Skip API, go straight to emergency routing
      setAnalysisResult({
        symptoms: parseTranscriptToSymptoms(text, lang),
        prediction: 'Emergency — Immediate Attention Required',
        confidence: 1.0,
        priority: 'emergency',
        summary: text,
        gemini_summary: 'Emergency symptoms detected. Please seek immediate medical attention.'
      })
      setPhase('result')
      return
    }
    
    const detectedSymptoms = parseTranscriptToSymptoms(text, lang)
    
    try {
      // Step 1: Get ML prediction from existing api.py (port 5001)
      const mlResponse = await axios.post(
        `${import.meta.env.VITE_PREDICTOR_URL}/predict`,
        { symptoms: detectedSymptoms }
      )
      
      const mlData = mlResponse.data
      
      // Step 2: Get Gemini summary (calls our new backend endpoint)
      let geminiSummary = ''
      try {
        const geminiResponse = await axios.post(
          `${import.meta.env.VITE_API_URL}/ai/voice-analyze`,
          { transcript: text, symptoms: detectedSymptoms, lang }
        )
        geminiSummary = geminiResponse.data.summary || ''
      } catch (geminiErr) {
        // Gemini failed — not critical, continue without it
        console.warn('Gemini analysis unavailable:', geminiErr.message)
        geminiSummary = ''
      }
      
      // Determine priority from ML + symptoms
      let priority = 'general'
      const patientAge = parseInt(localStorage.getItem('patient_age') || '30')
      if (patientAge >= 60) priority = 'senior'
      if (patientAge < 12) priority = 'child'
      if (mlData.confidence > 0.8 && detectedSymptoms.shortness_breath === 1) priority = 'emergency'
      
      setAnalysisResult({
        symptoms: detectedSymptoms,
        prediction: mlData.predicted_disease || 'Unknown',
        confidence: mlData.confidence || 0,
        priority,
        summary: text,
        gemini_summary: geminiSummary,
        see_doctor: mlData.see_doctor
      })
      
      setPhase('result')
      
    } catch (err) {
      console.error('Analysis failed:', err)
      // Still show what we detected from voice
      setAnalysisResult({
        symptoms: detectedSymptoms,
        prediction: 'Analysis unavailable',
        confidence: 0,
        priority: 'general',
        summary: text,
        gemini_summary: ''
      })
      setPhase('result')
    }
  }
  
  function handleProceed() {
    // Save to sessionStorage so symptom-checker and consultation pages can read it
    sessionStorage.setItem('voice_analysis', JSON.stringify(analysisResult))
    sessionStorage.setItem('voice_transcript', transcript)
    
    // Navigate to consultation flow with pre-filled data
    navigate('/patient/symptom-checker', { 
      state: { 
        fromVoice: true, 
        analysis: analysisResult,
        transcript 
      } 
    })
  }
  
  function handleSkip() {
    navigate('/patient/symptom-checker')
  }

  // ---- RENDER ----
  
  if (phase === 'fallback') {
    // iOS or mic denied — show manual symptom selection
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⌨️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {t('voice.notSupported', 'Voice not supported on this browser')}
          </h2>
          <p className="text-gray-500 mb-6 text-sm">
            {t('voice.useManual', 'Please select your symptoms manually')}
          </p>
          <button
            onClick={handleSkip}
            className="w-full bg-teal-500 text-white py-3 rounded-xl font-medium hover:bg-teal-600 transition"
          >
            {t('voice.selectManually', 'Select Symptoms Manually')}
          </button>
        </div>
      </div>
    )
  }
  
  if (phase === 'listening') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          
          {/* Pulsing mic animation */}
          <div className="relative flex items-center justify-center mb-8">
            {isListening && (
              <>
                <span className="absolute w-24 h-24 rounded-full bg-teal-200 animate-ping opacity-60" />
                <span className="absolute w-20 h-20 rounded-full bg-teal-300 animate-ping opacity-40" style={{animationDelay:'0.3s'}} />
              </>
            )}
            <div className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-3xl
              ${isListening ? 'bg-teal-500' : 'bg-gray-300'}`}>
              🎤
            </div>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {t('voice.speaking', 'Tell us what you feel')}
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            {t('voice.speakNow', 'Speak your symptoms in Hindi, Punjabi or English')}
          </p>
          <p className="text-gray-500 text-xs mb-6">
            {t('voice.example', 'Example: "Mujhe bukhaar hai aur sar dard ho raha hai"')}
          </p>
          
          {/* Live transcript display */}
          {transcript && (
            <div className="bg-teal-50 rounded-xl p-4 text-left mb-4">
              <p className="text-sm text-teal-800 font-medium mb-1">{t('voice.heard', 'Heard:')}</p>
              <p className="text-gray-700 text-sm">{transcript}</p>
            </div>
          )}
          
          <button
            onClick={handleSkip}
            className="text-gray-400 text-sm underline"
          >
            {t('voice.skip', 'Skip voice input')}
          </button>
        </div>
      </div>
    )
  }
  
  if (phase === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {t('voice.analyzing', 'Analyzing your symptoms...')}
          </h2>
          <p className="text-gray-500 text-sm">
            {t('voice.wait', 'AI is processing your description')}
          </p>
        </div>
      </div>
    )
  }
  
  if (phase === 'result' && analysisResult) {
    const detectedList = Object.entries(analysisResult.symptoms)
      .filter(([, v]) => v === 1)
      .map(([k]) => k.replace(/_/g, ' '))
    
    const priorityColors = {
      emergency: 'bg-red-100 text-red-700 border-red-200',
      senior: 'bg-orange-100 text-orange-700 border-orange-200',
      child: 'bg-blue-100 text-blue-700 border-blue-200',
      general: 'bg-green-100 text-green-700 border-green-200'
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 p-4 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-4 pt-6 pb-10">
          
          {/* Header */}
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-gray-800">
              {t('analysis.title', 'Your Symptom Analysis')}
            </h1>
          </div>
          
          {/* Priority badge */}
          {analysisResult.priority === 'emergency' && (
            <div className="bg-red-500 text-white rounded-2xl p-4 text-center font-bold text-lg animate-pulse">
              ⚠️ {t('analysis.emergency', 'EMERGENCY — Seek Immediate Help')}
            </div>
          )}
          
          {/* Prediction card */}
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">
              {t('analysis.prediction', 'Likely condition')}
            </p>
            <h2 className="text-xl font-bold text-teal-700">
              {analysisResult.prediction}
            </h2>
            {analysisResult.confidence > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{t('analysis.confidence', 'Confidence')}</span>
                  <span>{Math.round(analysisResult.confidence * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.round(analysisResult.confidence * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Detected symptoms */}
          {detectedList.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-5">
              <p className="text-xs font-medium text-gray-400 uppercase mb-3">
                {t('analysis.symptomsDetected', 'Symptoms Detected')}
              </p>
              <div className="flex flex-wrap gap-2">
                {detectedList.map(s => (
                  <span key={s} className="bg-teal-100 text-teal-700 text-sm px-3 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Gemini AI summary — only if available */}
          {analysisResult.gemini_summary && (
            <div className="bg-white rounded-2xl shadow p-5">
              <p className="text-xs font-medium text-gray-400 uppercase mb-2">
                {t('analysis.aiAdvice', 'AI Health Advice')}
              </p>
              <p className="text-gray-700 text-sm leading-relaxed">
                {analysisResult.gemini_summary}
              </p>
            </div>
          )}
          
          {/* Priority info */}
          <div className={`rounded-2xl border p-4 ${priorityColors[analysisResult.priority] || priorityColors.general}`}>
            <p className="text-xs font-medium uppercase mb-1">
              {t('analysis.queuePriority', 'Queue Priority')}
            </p>
            <p className="font-bold capitalize text-lg">
              {analysisResult.priority}
            </p>
          </div>
          
          {/* What you said */}
          <div className="bg-gray-50 rounded-2xl p-4 border">
            <p className="text-xs font-medium text-gray-400 uppercase mb-2">
              {t('analysis.youSaid', 'What you said')}
            </p>
            <p className="text-gray-600 text-sm italic">"{transcript}"</p>
          </div>
          
          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleProceed}
              className="w-full bg-teal-500 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-teal-600 active:scale-95 transition"
            >
              {analysisResult.priority === 'emergency'
                ? t('analysis.getEmergencyHelp', 'Get Emergency Help Now')
                : t('analysis.findDoctor', 'Find a Doctor')}
            </button>
            <button
              onClick={handleSkip}
              className="w-full border border-gray-300 text-gray-600 py-3 rounded-2xl font-medium hover:bg-gray-50 transition"
            >
              {t('analysis.editSymptoms', 'Edit Symptoms Manually')}
            </button>
          </div>
          
        </div>
      </div>
    )
  }
  
  return null
}
```

**MODIFY: `frontend/rishu-diital-chikitsak/src/patient/pages/Dashboard.jsx`**

Find the current return statement / main render. Replace whatever the current first screen shows with VoiceOnboarding as the first thing rendered when a logged-in patient lands on the dashboard.

Add import at the top:
```jsx
import VoiceOnboarding from './VoiceOnboarding'
```

Add state:
```jsx
const [showVoiceOnboarding, setShowVoiceOnboarding] = useState(true)
```

Wrap the entire existing dashboard JSX in a condition:
```jsx
if (showVoiceOnboarding) {
  return <VoiceOnboarding onComplete={() => setShowVoiceOnboarding(false)} />
}
// ...existing dashboard JSX below
```

---

## TASK 2 — Backend: Voice Analysis Endpoint (Gemini + ML)

### Files to modify

**MODIFY: `backend/chikitsak-backend/app.py`**

Add this new endpoint. Place it AFTER the existing `/api/ai/symptom` endpoint (do not delete that endpoint).

```python
# ADD at top of app.py with other imports:
import os
import json
import requests as http_requests  # rename to avoid conflict with flask's request

# ADD this new endpoint:
@app.route('/api/ai/voice-analyze', methods=['POST'])
@jwt_required  # use your existing JWT decorator
def voice_analyze():
    """
    Analyzes voice transcript using Gemini API.
    Falls back gracefully if Gemini key not set.
    
    Request body:
    {
        "transcript": "mujhe bukhaar hai aur sar dard...",
        "symptoms": {"fever": 1, "headache": 1, ...},
        "lang": "hi"
    }
    
    Response:
    {
        "summary": "Based on your symptoms...",
        "advice": "...",
        "see_doctor": true
    }
    """
    data = request.get_json()
    transcript = data.get('transcript', '')
    symptoms = data.get('symptoms', {})
    lang = data.get('lang', 'en')
    
    # Build detected symptom list for context
    detected = [k.replace('_', ' ') for k, v in symptoms.items() if v == 1]
    
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    
    if not GEMINI_API_KEY:
        # No key configured — return empty, frontend handles gracefully
        return jsonify({'summary': '', 'advice': '', 'see_doctor': True})
    
    lang_instruction = {
        'hi': 'Respond in simple Hindi (Hinglish is fine).',
        'pa': 'Respond in simple Punjabi or Hindi.',
        'en': 'Respond in simple English.'
    }.get(lang, 'Respond in simple English.')
    
    prompt = f"""You are a medical triage assistant in India. A patient described their symptoms.

Patient said: "{transcript}"
Detected symptoms: {', '.join(detected) if detected else 'none clearly identified'}

{lang_instruction}

Give a SHORT response (3-4 sentences max) covering:
1. What condition this might be
2. One simple home care tip
3. Whether they need to see a doctor (yes/no)

IMPORTANT: 
- Do NOT diagnose definitively
- Keep it simple for a rural patient
- If serious symptoms (chest pain, can't breathe, unconscious) say "Please go to hospital immediately"
- Return ONLY a JSON object with keys: summary (string), advice (string), see_doctor (boolean)
- No markdown, no code blocks, just raw JSON"""

    try:
        # Using gemini-2.0-flash-lite — fastest and free tier friendly
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 300,
                "responseMimeType": "application/json"
            }
        }
        
        resp = http_requests.post(gemini_url, json=payload, timeout=10)
        resp.raise_for_status()
        
        result = resp.json()
        text = result['candidates'][0]['content']['parts'][0]['text']
        
        # Parse the JSON response
        parsed = json.loads(text)
        return jsonify({
            'summary': parsed.get('summary', ''),
            'advice': parsed.get('advice', ''),
            'see_doctor': parsed.get('see_doctor', True)
        })
        
    except Exception as e:
        print(f"Gemini API error: {e}")
        # Silent fallback — frontend shows analysis without Gemini summary
        return jsonify({'summary': '', 'advice': '', 'see_doctor': True})
```

**MODIFY: `backend/chikitsak-backend/.env`**

Add this line (patient pastes their own key here):
```
GEMINI_API_KEY=PASTE_YOUR_GEMINI_API_KEY_HERE
```

---

## TASK 3 — Smart Routing: Instant Call vs Token Queue

### What to build
After patient sees analysis (Task 1) and proceeds, the symptom-checker should check doctor availability. If online → instant Jitsi call. If busy → issue token.

### Files to modify

**MODIFY: `frontend/rishu-diital-chikitsak/src/patient/pages/SymptomChecker.jsx`**

Find where `find_best_doctor` is called (or where doctor routing happens after the final step).

REPLACE the existing doctor assignment logic with this:

```jsx
// At top of SymptomChecker.jsx, import supabase client:
import { supabase } from '../../lib/supabaseClient'  // adjust path to your existing client
import { useNavigate } from 'react-router-dom'

// Inside the component, after all steps complete and doctor is found:

async function handleFindDoctor(specialization, symptoms, priority) {
  setLoading(true)
  
  try {
    // 1. Call your existing find_best_doctor RPC
    const { data: doctorData, error } = await supabase
      .rpc('find_best_doctor', { target_spec: specialization })
    
    if (error || !doctorData) {
      setError('No doctors available. Please try again.')
      setLoading(false)
      return
    }
    
    const doctor = Array.isArray(doctorData) ? doctorData[0] : doctorData
    
    // 2. Check doctor's current status from doctors table
    const { data: statusData } = await supabase
      .from('doctors')
      .select('status, id, name, specialization')
      .eq('id', doctor.id)
      .single()
    
    if (!statusData) {
      setError('Could not retrieve doctor status.')
      setLoading(false)
      return
    }
    
    if (statusData.status === 'online') {
      // Doctor is FREE — skip queue, go straight to video
      // Create a consultation record first
      const jitsiRoom = `dc-${statusData.id}-${Date.now()}`
      
      // Update doctor status to in_call
      await supabase
        .from('doctors')
        .update({ status: 'in_call', current_patient_id: patientId })
        .eq('id', statusData.id)
      
      // Insert token with status in_consultation
      const { data: tokenData } = await supabase
        .from('tokens')
        .insert({
          patient_id: patientId,
          doctor_id: statusData.id,
          priority: priority,
          status: 'in_consultation',
          jitsi_room: jitsiRoom,
          symptoms: symptoms,
          queue_position: 0
        })
        .select()
        .single()
      
      navigate(`/patient/consultation/${tokenData.id}`, {
        state: {
          jitsiRoom,
          doctorName: statusData.name,
          isInstant: true
        }
      })
      
    } else {
      // Doctor is BUSY — issue token, go to queue page
      // Get current queue length for this doctor
      const { count } = await supabase
        .from('tokens')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', statusData.id)
        .eq('status', 'waiting')
      
      const position = (count || 0) + 1
      const estimatedWait = position * 8 // 8 min avg per patient
      
      const { data: tokenData } = await supabase
        .from('tokens')
        .insert({
          patient_id: patientId,
          doctor_id: statusData.id,
          priority: priority,
          status: 'waiting',
          queue_position: position,
          estimated_wait: estimatedWait,
          symptoms: symptoms,
          jitsi_room: null  // assigned when called
        })
        .select()
        .single()
      
      navigate('/patient/tokens', {
        state: {
          tokenId: tokenData.id,
          tokenNumber: tokenData.token_number,
          doctorName: statusData.name,
          position,
          estimatedWait
        }
      })
    }
    
  } catch (err) {
    console.error('Doctor routing error:', err)
    setError('Something went wrong. Please try again.')
  } finally {
    setLoading(false)
  }
}
```

---

## TASK 4 — Doctor Queue: Patient Info Card

### What to build
In `doctor/pages/Queue.jsx`, before a doctor clicks "Call Patient", they MUST see a full patient info card. Currently it doesn't show symptom details.

### Files to modify

**MODIFY: `frontend/rishu-diital-chikitsak/src/doctor/pages/Queue.jsx`**

Find where tokens/patients are listed. For each token entry in the queue, add an expandable info card.

ADD this component inside Queue.jsx (above the main export):

```jsx
function PatientInfoCard({ token, onCall }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  
  const symptoms = token.symptoms || {}
  const detectedSymptoms = Object.entries(symptoms)
    .filter(([, v]) => v === 1)
    .map(([k]) => k.replace(/_/g, ' '))
  
  const priorityBg = {
    emergency: 'bg-red-50 border-red-300',
    senior: 'bg-orange-50 border-orange-300',
    child: 'bg-blue-50 border-blue-300',
    general: 'bg-white border-gray-200'
  }
  
  const waitMin = token.estimated_wait || (token.queue_position * 8)
  const waitedSince = token.created_at 
    ? Math.floor((Date.now() - new Date(token.created_at)) / 60000)
    : 0
  
  return (
    <div className={`rounded-2xl border-2 ${priorityBg[token.priority] || priorityBg.general} p-4 mb-3`}>
      
      {/* Collapsed row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-teal-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm">
            {token.queue_position || 'N'}
          </div>
          <div>
            <p className="font-semibold text-gray-800">
              {token.patient_name || `Patient #${token.token_number}`}
            </p>
            <p className="text-xs text-gray-500">
              Waited {waitedSince} min · Priority: <span className="font-medium capitalize">{token.priority}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setExpanded(p => !p)}
            className="text-xs text-teal-600 underline"
          >
            {expanded ? 'Hide' : 'Details'}
          </button>
          <button
            onClick={() => onCall(token)}
            className="bg-teal-500 text-white text-sm px-4 py-2 rounded-xl font-medium hover:bg-teal-600 transition"
          >
            {t('doctor.callPatient', 'Call')}
          </button>
        </div>
      </div>
      
      {/* Expanded info */}
      {expanded && (
        <div className="mt-4 space-y-3 border-t pt-4">
          
          {/* Symptoms */}
          {detectedSymptoms.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-2">Symptoms</p>
              <div className="flex flex-wrap gap-1">
                {detectedSymptoms.map(s => (
                  <span key={s} className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* ML Prediction */}
          {token.ml_prediction && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">ML Prediction</p>
              <p className="text-gray-700 font-medium">{token.ml_prediction}</p>
              {token.ml_confidence && (
                <p className="text-xs text-gray-500">
                  Confidence: {Math.round(token.ml_confidence * 100)}%
                </p>
              )}
            </div>
          )}
          
          {/* AI Summary */}
          {token.ai_summary && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">AI Analysis</p>
              <p className="text-gray-600 text-sm">{token.ai_summary}</p>
            </div>
          )}
          
          {/* What patient said */}
          {token.voice_transcript && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">Patient's words</p>
              <p className="text-gray-600 text-sm italic">"{token.voice_transcript}"</p>
            </div>
          )}
          
          {/* Queue info */}
          <div className="flex gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Queue position</p>
              <p className="font-bold text-gray-700">#{token.queue_position}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Est. wait</p>
              <p className="font-bold text-gray-700">{waitMin} min</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Waited</p>
              <p className="font-bold text-gray-700">{waitedSince} min</p>
            </div>
          </div>
          
        </div>
      )}
    </div>
  )
}
```

Then in the main Queue component, REPLACE the existing token list render with:
```jsx
{tokens.map(token => (
  <PatientInfoCard
    key={token.id}
    token={token}
    onCall={handleCallPatient}
  />
))}
```

**MODIFY: Supabase `tokens` table**

Add these columns to the tokens table. Run in Supabase SQL editor:

```sql
-- Run in Supabase SQL editor
ALTER TABLE tokens 
  ADD COLUMN IF NOT EXISTS ml_prediction TEXT,
  ADD COLUMN IF NOT EXISTS ml_confidence FLOAT,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS voice_transcript TEXT,
  ADD COLUMN IF NOT EXISTS patient_name TEXT;
```

**MODIFY: `frontend/rishu-diital-chikitsak/src/patient/pages/SymptomChecker.jsx`**

In the `handleFindDoctor` function from Task 3, when inserting the token, also save the analysis data:

```jsx
// In the token insert calls (both online and waiting cases), add these fields:
const voiceAnalysis = JSON.parse(sessionStorage.getItem('voice_analysis') || '{}')
const voiceTranscript = sessionStorage.getItem('voice_transcript') || ''

// Add to the insert payload:
ml_prediction: voiceAnalysis.prediction || null,
ml_confidence: voiceAnalysis.confidence || null,
ai_summary: voiceAnalysis.gemini_summary || null,
voice_transcript: voiceTranscript,
patient_name: patientProfile?.name || null,  // use your existing patient name variable
```

---

## TASK 5 — Post-Consultation Notes

### What to build
After Jitsi call ends, doctor sees a form to fill notes. This creates a consultation record in MySQL. Currently there is no post-call screen.

### Files to create

**CREATE: `frontend/rishu-diital-chikitsak/src/doctor/pages/PostConsultation.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import axios from 'axios'

export default function PostConsultation() {
  const navigate = useNavigate()
  const { tokenId } = useParams()
  const location = useLocation()
  const tokenData = location.state || {}
  
  const [form, setForm] = useState({
    diagnosis: '',
    prescription: '',
    notes: '',
    follow_up_days: '',
    severity: 'mild'
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  async function handleSubmit() {
    if (!form.diagnosis.trim()) {
      alert('Please enter a diagnosis.')
      return
    }
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      
      // Save to MySQL consultations table via Flask API
      await axios.post(
        `${import.meta.env.VITE_API_URL}/consultations`,
        {
          token_id: tokenId,
          patient_id: tokenData.patientId,
          doctor_id: tokenData.doctorId,
          diagnosis: form.diagnosis,
          prescription: form.prescription,
          notes: form.notes,
          follow_up_days: form.follow_up_days ? parseInt(form.follow_up_days) : null,
          severity: form.severity,
          jitsi_room: tokenData.jitsiRoom || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // Mark token as done in Supabase
      const { supabase } = await import('../../lib/supabaseClient')
      await supabase
        .from('tokens')
        .update({ status: 'done', done_at: new Date().toISOString() })
        .eq('id', tokenId)
      
      // Update doctor status back to online
      if (tokenData.doctorId) {
        await supabase
          .from('doctors')
          .update({ status: 'online', current_patient_id: null })
          .eq('id', tokenData.doctorId)
      }
      
      setSubmitted(true)
      
      // Auto-navigate back to queue after 2 seconds
      setTimeout(() => navigate('/doctor/queue'), 2000)
      
    } catch (err) {
      console.error('Save consultation error:', err)
      alert('Error saving notes. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  if (submitted) {
    return (
      <div className="min-h-screen bg-teal-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Consultation Saved</h2>
          <p className="text-gray-500">Returning to queue...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-teal-50 p-4">
      <div className="max-w-lg mx-auto pt-6 pb-20 space-y-4">
        
        <h1 className="text-2xl font-bold text-gray-800">Post-Consultation Notes</h1>
        
        {tokenData.patientName && (
          <p className="text-gray-500">Patient: <span className="font-medium text-gray-700">{tokenData.patientName}</span></p>
        )}
        
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          
          {/* Severity */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Severity *</label>
            <div className="flex gap-2">
              {['mild', 'moderate', 'severe'].map(s => (
                <button
                  key={s}
                  onClick={() => setForm(p => ({ ...p, severity: s }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition capitalize
                    ${form.severity === s ? 'bg-teal-500 text-white border-teal-500' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          
          {/* Diagnosis */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Diagnosis *</label>
            <input
              type="text"
              value={form.diagnosis}
              onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))}
              placeholder="e.g., Viral fever, Common cold..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-teal-400"
            />
          </div>
          
          {/* Prescription */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Prescription / Medicines</label>
            <textarea
              value={form.prescription}
              onChange={e => setForm(p => ({ ...p, prescription: e.target.value }))}
              placeholder="e.g., Paracetamol 500mg × 3 days..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-teal-400 resize-none"
            />
          </div>
          
          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Clinical Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Additional observations..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-teal-400 resize-none"
            />
          </div>
          
          {/* Follow up */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Follow-up in (days)</label>
            <input
              type="number"
              value={form.follow_up_days}
              onChange={e => setForm(p => ({ ...p, follow_up_days: e.target.value }))}
              placeholder="Leave blank if no follow-up"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-teal-400"
              min="1"
              max="365"
            />
          </div>
          
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-teal-500 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-teal-600 disabled:opacity-50 transition"
        >
          {loading ? 'Saving...' : 'Save & Close Consultation'}
        </button>
        
        <button
          onClick={() => navigate('/doctor/queue')}
          className="w-full border border-gray-300 text-gray-600 py-3 rounded-2xl font-medium hover:bg-gray-50 transition"
        >
          Skip Notes (Go Back to Queue)
        </button>
        
      </div>
    </div>
  )
}
```

**MODIFY: `frontend/rishu-diital-chikitsak/src/router.jsx`**

Add the new route. Find the `/doctor` routes section and add:
```jsx
import PostConsultation from './doctor/pages/PostConsultation'

// Inside your routes:
{ path: '/doctor/post-consultation/:tokenId', element: <PostConsultation /> }
```

**MODIFY: `frontend/rishu-diital-chikitsak/src/doctor/pages/Queue.jsx`**

In your existing `handleCallPatient` function, after the Jitsi room is opened, navigate to post-consultation when call ends.

Wrap the Jitsi call in a way that after it's done, you go to:
```jsx
navigate(`/doctor/post-consultation/${token.id}`, {
  state: {
    patientId: token.patient_id,
    patientName: token.patient_name,
    doctorId: currentDoctorId,
    jitsiRoom: token.jitsi_room
  }
})
```

**MODIFY: `backend/chikitsak-backend/app.py`**

Add a PUT endpoint to update the consultation with notes:

```python
@app.route('/api/consultations/<int:consultation_id>/notes', methods=['PUT'])
@jwt_required
def update_consultation_notes(consultation_id):
    data = request.get_json()
    cursor = db.cursor()
    cursor.execute("""
        UPDATE consultations 
        SET diagnosis=%s, prescription=%s, notes=%s, 
            follow_up_days=%s, severity=%s, updated_at=NOW()
        WHERE id=%s
    """, (
        data.get('diagnosis'),
        data.get('prescription'),
        data.get('notes'),
        data.get('follow_up_days'),
        data.get('severity', 'mild'),
        consultation_id
    ))
    db.commit()
    return jsonify({'success': True})
```

**MODIFY: `backend/chikitsak-backend/database.py`**

Add these columns to the `consultations` table if not already there:

```sql
-- Run in MySQL (telemedicine DB):
ALTER TABLE consultations 
  ADD COLUMN IF NOT EXISTS diagnosis VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prescription TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS follow_up_days INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS severity ENUM('mild','moderate','severe') DEFAULT 'mild';
```

---

## TASK 6 — LM Studio → Gemini Fallback

### What to build
Currently the `/api/ai/symptom` endpoint calls LM Studio at `http://127.0.0.1:1234`. This only works on developer's local machine. Add fallback to Gemini when LM Studio is unreachable.

### Files to modify

**MODIFY: `backend/chikitsak-backend/app.py`**

Find the existing `/api/ai/symptom` endpoint. Replace its request logic with:

```python
@app.route('/api/ai/symptom', methods=['POST'])
@jwt_required
def ai_symptom_analysis():
    data = request.get_json()
    message = data.get('message', '')
    lang = data.get('lang', 'en')
    
    LMSTUDIO_URL = os.getenv('LMSTUDIO_URL', 'http://127.0.0.1:1234/v1/chat/completions')
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    DEFAULT_MODEL = os.getenv('DEFAULT_MODEL', 'qwen3')
    
    system_prompt = """You are a medical assistant for rural India. 
    Give simple, clear health advice. Mention when to see a doctor.
    Do NOT give specific drug dosages. Keep response under 150 words."""
    
    # Try LM Studio first (local)
    try:
        resp = http_requests.post(
            LMSTUDIO_URL,
            json={
                "model": DEFAULT_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                "max_tokens": 300,
                "temperature": 0.3
            },
            timeout=5  # 5 second timeout — fail fast
        )
        resp.raise_for_status()
        result = resp.json()
        reply = result['choices'][0]['message']['content']
        return jsonify({'reply': reply, 'source': 'lmstudio'})
        
    except Exception as lm_err:
        print(f"LM Studio unavailable: {lm_err} — falling back to Gemini")
        
        # Fallback to Gemini
        if not GEMINI_API_KEY:
            return jsonify({
                'reply': 'AI assistant is currently unavailable. Please describe your symptoms to the doctor during consultation.',
                'source': 'fallback'
            })
        
        try:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key={GEMINI_API_KEY}"
            
            resp = http_requests.post(
                gemini_url,
                json={
                    "system_instruction": {"parts": [{"text": system_prompt}]},
                    "contents": [{"parts": [{"text": message}]}],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 300}
                },
                timeout=10
            )
            resp.raise_for_status()
            result = resp.json()
            reply = result['candidates'][0]['content']['parts'][0]['text']
            return jsonify({'reply': reply, 'source': 'gemini'})
            
        except Exception as gem_err:
            print(f"Gemini also failed: {gem_err}")
            return jsonify({
                'reply': 'AI assistant is temporarily unavailable.',
                'source': 'error'
            }), 200  # Return 200 so frontend doesn't crash
```

---

## TASK 7 — iOS Voice Fallback (Quick Fix)

### What to build
Web Speech API doesn't work on iOS Safari. The mic button should gracefully hide on unsupported browsers and show symptom checklist instead.

**MODIFY: `frontend/rishu-diital-chikitsak/src/patient/pages/VoiceOnboarding.jsx`**

This is already handled in the component from Task 1 — the `useEffect` checks `'SpeechRecognition' in window` and sets `phase = 'fallback'` if not supported. No extra work needed beyond Task 1.

---

## TASK 8 — Add i18n Keys for New Components

**MODIFY: `frontend/rishu-diital-chikitsak/src/i18n/locales/en.json`**

Add these keys (merge with existing file, do NOT overwrite):
```json
{
  "voice": {
    "speaking": "Tell us what you feel",
    "speakNow": "Speak your symptoms in Hindi, Punjabi or English",
    "example": "Example: \"I have fever and headache\"",
    "heard": "Heard:",
    "skip": "Skip voice input",
    "analyzing": "Analyzing your symptoms...",
    "wait": "AI is processing your description",
    "notSupported": "Voice not supported on this browser",
    "useManual": "Please select your symptoms manually",
    "selectManually": "Select Symptoms Manually"
  },
  "analysis": {
    "title": "Your Symptom Analysis",
    "prediction": "Likely condition",
    "confidence": "Confidence",
    "symptomsDetected": "Symptoms Detected",
    "aiAdvice": "AI Health Advice",
    "queuePriority": "Queue Priority",
    "youSaid": "What you said",
    "findDoctor": "Find a Doctor",
    "getEmergencyHelp": "Get Emergency Help Now",
    "editSymptoms": "Edit Symptoms Manually",
    "emergency": "EMERGENCY — Seek Immediate Help"
  },
  "doctor": {
    "callPatient": "Call",
    "queueTitle": "Patient Queue"
  }
}
```

**MODIFY: `frontend/rishu-diital-chikitsak/src/i18n/locales/hi.json`**

Add (merge, don't overwrite):
```json
{
  "voice": {
    "speaking": "Apni takleef batayein",
    "speakNow": "Hindi, Punjabi ya English mein bolein",
    "example": "Udaharan: \"Mujhe bukhaar hai aur sar dard ho raha hai\"",
    "heard": "Suna:",
    "skip": "Voice input skip karein",
    "analyzing": "Aapke symptoms analyze ho rahe hain...",
    "wait": "AI aapki jaankari process kar raha hai",
    "notSupported": "Is browser mein voice support nahi hai",
    "useManual": "Kripya symptoms manually chunein",
    "selectManually": "Symptoms Manually Chunein"
  },
  "analysis": {
    "title": "Aapke Symptoms ka Analysis",
    "prediction": "Sambhavit bimari",
    "confidence": "Certainty",
    "symptomsDetected": "Detected Symptoms",
    "aiAdvice": "AI Swasthya Sujhav",
    "queuePriority": "Queue Priority",
    "youSaid": "Aapne kya kaha",
    "findDoctor": "Doctor Dhundein",
    "getEmergencyHelp": "Turant Madad Len",
    "editSymptoms": "Symptoms Manually Badlein",
    "emergency": "EMERGENCY — Turant Madad Zaroor Len"
  }
}
```

---

## TASK 9 — Package Installation

Run in frontend directory:
```bash
cd frontend/rishu-diital-chikitsak
npm install
# react-speech-recognition is NOT needed — we use native Web Speech API directly
# All other packages already installed
```

Run in backend directory:
```bash
cd backend/chikitsak-backend
pip install requests  # already installed likely, just confirm
```

---

## COMPLETE ORDER OF EXECUTION

Run tasks in this order. Each task must be COMPLETE before next:

1. **TASK 9** — Verify packages (5 min)
2. **TASK 2** — Add Gemini endpoint to `app.py` + `.env` key placeholder (20 min)
3. **TASK 6** — LM Studio fallback in `app.py` (15 min)
4. **TASK 1** — Create `VoiceOnboarding.jsx` + modify `Dashboard.jsx` (45 min)
5. **TASK 8** — Add i18n keys to `en.json` and `hi.json` (10 min)
6. **TASK 3** — Modify `SymptomChecker.jsx` routing logic (30 min)
7. **TASK 4** — Doctor queue patient info card + Supabase SQL (30 min)
8. **TASK 5** — Create `PostConsultation.jsx` + add route + MySQL columns (30 min)

**Total estimated time: 3-4 hours**

---

## ENVIRONMENT VARIABLES CHECKLIST

### `backend/chikitsak-backend/.env` — all keys needed:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=telemedicine

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_anon_key

CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

JWT_SECRET=your-secret

LMSTUDIO_URL=http://127.0.0.1:1234/v1/chat/completions
DEFAULT_MODEL=qwen3

GEMINI_API_KEY=PASTE_YOUR_KEY_HERE   ← ADD THIS
```

### `frontend/rishu-diital-chikitsak/.env` — no new keys needed

---

## TESTING CHECKLIST (after all tasks done)

1. Open `/patient` → mic pops up automatically → speak "mujhe bukhaar aur sar dard hai" → analysis appears → confidence bar shows → tap "Find a Doctor"
2. If doctor online → Jitsi room opens immediately
3. If doctor busy → token page with queue position and wait time
4. Log in as doctor → queue shows patient cards → expand → see symptoms + ML prediction
5. After call → post-consultation form appears → fill diagnosis → submit → queue refreshes
6. Test on Chrome Android → voice works
7. Test on iOS Safari → voice mic hidden → symptom selector shown instead
8. Kill LM Studio → AI chat still works via Gemini fallback
9. Remove `GEMINI_API_KEY` from .env → everything still works, just no AI summary

---

## THINGS TO NOT DO (for AI IDE)

- Do NOT change the Supabase `schema.sql` structure beyond adding columns in Task 4
- Do NOT modify `api.py` (disease prediction API on port 5001) — it's used as-is
- Do NOT touch authentication logic in `app.py` 
- Do NOT change the `find_best_doctor` RPC in Supabase — it works
- Do NOT rename existing routes in `router.jsx` — only ADD new ones
- Do NOT change `i18n` structure — only ADD new keys inside existing files
