/**
 * VoiceOnboarding — shown when patient opens /patient
 * Shows a mic button. Patient taps to start speaking.
 * Does NOT auto-start voice. Patient can also skip to manual symptom checker.
 */
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { enqueueAction } from '../../utils/offlineQueue'

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
    wounds: ['wound', 'cut', 'injury', 'bleeding'],
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
    wounds: ['ghav', 'chot', 'zakhm', 'khoon'],
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
    wounds: ['ghav', 'chot'],
  },
}

const ALL_SYMPTOMS = [
  'fever','headache','fatigue','dizziness','cough','shortness_breath',
  'sore_throat','runny_nose','nausea','vomiting','stomach_pain','diarrhea',
  'joint_pain','muscle_pain','back_pain','swelling','rash','itching',
  'dry_skin','wounds',
]

const EMERGENCY_KEYWORDS = [
  'chest pain','heart attack','stroke','unconscious','cant breathe',
  'severe bleeding','paralysis','seizure','fitting',
  'sine dard','dil ka dauraa','behoshi','zyaada khoon',
  'seene mein dard','sans nahi','hosh nahi',
]

function parseTranscriptToSymptoms(transcript, lang = 'en') {
  const lower = transcript.toLowerCase()
  const keywords = SYMPTOM_KEYWORDS[lang] || SYMPTOM_KEYWORDS.en
  const detected = {}
  ALL_SYMPTOMS.forEach(s => { detected[s] = 0 })
  Object.entries(keywords).forEach(([symptom, words]) => {
    if (words.some(w => lower.includes(w))) detected[symptom] = 1
  })
  return detected
}

function checkEmergency(transcript) {
  const lower = transcript.toLowerCase()
  return EMERGENCY_KEYWORDS.some(kw => lower.includes(kw))
}

const PRIORITY_COLORS = {
  emergency: 'bg-red-100 text-red-700 border-red-200',
  senior:    'bg-orange-100 text-orange-700 border-orange-200',
  child:     'bg-blue-100 text-blue-700 border-blue-200',
  general:   'bg-green-100 text-green-700 border-green-200',
}

export default function VoiceOnboarding({ onDismiss }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const lang = i18n.language?.split('-')[0] || 'en'
  // onDismiss: called when patient wants to go to full dashboard instead of symptom checker

  // phase: 'idle' | 'listening' | 'processing' | 'result' | 'mic-denied'
  const [phase, setPhase] = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [micUnsupported, setMicUnsupported] = useState(false)

  const recognitionRef = useRef(null)
  const timeoutRef = useRef(null)
  const transcriptRef = useRef('')
  const hasRetried = useRef(false)

  const langMap = { en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN' }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setMicUnsupported(true)
      return
    }

    const recognition = new SR()
    recognition.lang = langMap[lang] || 'hi-IN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setPhase('listening')
    }

    recognition.onresult = (event) => {
      let finalText = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + ' '
        } else {
          interim += event.results[i][0].transcript
        }
      }
      if (interim) setInterimText(interim)
      if (finalText) {
        transcriptRef.current += finalText
        setTranscript(transcriptRef.current)
        setInterimText('')
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => recognition.stop(), 5000)
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setMicUnsupported(true)
        setPhase('mic-denied')
      } else if (event.error === 'no-speech') {
        if (!hasRetried.current) {
          hasRetried.current = true
          setTimeout(startListening, 500)
        } else {
          setPhase('fallback')
        }
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      const text = transcriptRef.current.trim()
      if (text.length > 3) {
        processTranscript(text)
      } else {
        setPhase('idle')
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  function stopListening() {
    if (recognitionRef.current) recognitionRef.current.stop()
    setIsListening(false)
  }

  async function processTranscript(text) {
    setPhase('processing')

    if (checkEmergency(text)) {
      setAnalysisResult({
        symptoms: parseTranscriptToSymptoms(text, lang),
        prediction: 'Emergency — Immediate Attention Required',
        confidence: 1.0,
        priority: 'emergency',
        summary: text,
        gemini_summary: 'Emergency symptoms detected. Please seek immediate medical attention.',
      })
      setPhase('result')
      return
    }

    const detectedSymptoms = parseTranscriptToSymptoms(text, lang)

    try {
      const mlResponse = await axios.post(
        `${import.meta.env.VITE_PREDICTOR_URL}/predict`,
        { symptoms: detectedSymptoms },
        { timeout: 10000 }
      )
      const mlData = mlResponse.data

      let geminiSummary = ''
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
        if (!navigator.onLine) {
          // Save for retry when back online
          enqueueAction({
            type: 'SUBMIT_SYMPTOMS',
            payload: { transcript: text, symptoms: detectedSymptoms, lang },
          })
        } else {
          const geminiResponse = await axios.post(
            `${import.meta.env.VITE_API_URL}/ai/voice-analyze`,
            { transcript: text, symptoms: detectedSymptoms, lang },
            { headers: { Authorization: `Bearer ${token}` }, timeout: 12000 }
          )
          geminiSummary = geminiResponse.data.summary || ''
        }
      } catch {
        geminiSummary = ''
      }

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
        see_doctor: mlData.see_doctor,
      })
      setPhase('result')
    } catch {
      setAnalysisResult({
        symptoms: detectedSymptoms,
        prediction: 'Analysis unavailable',
        confidence: 0,
        priority: 'general',
        summary: text,
        gemini_summary: '',
      })
      setPhase('result')
    }
  }

  function handleProceed() {
    sessionStorage.setItem('voice_analysis', JSON.stringify(analysisResult))
    sessionStorage.setItem('voice_transcript', transcript)
    navigate('/patient/symptom-checker', {
      state: { fromVoice: true, analysis: analysisResult, transcript },
    })
  }

  function handleSkip() {
    // If called from Dashboard, dismiss back to dashboard; otherwise go to symptom checker
    if (onDismiss) {
      onDismiss()
    } else {
      navigate('/patient/symptom-checker')
    }
  }

  function handleGoToSymptomChecker() {
    navigate('/patient/symptom-checker')
  }

  function handleRetry() {
    transcriptRef.current = ''
    setTranscript('')
    setAnalysisResult(null)
    setPhase('idle')
  }

  // ── MIC DENIED ───────────────────────────────────────────────────────────
  if (phase === 'mic-denied') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {t('voice.micDenied', 'Microphone access needed')}
          </h2>
          <p className="text-gray-500 mb-6 text-sm">
            {t('voice.enableMic', 'Please allow microphone in browser settings, then tap retry')}
          </p>
          <button
            onClick={() => { setPhase('listening'); startListening() }}
            className="w-full bg-teal-500 text-white py-3 rounded-xl font-medium hover:bg-teal-600 transition mb-3"
          >
            {t('voice.retryMic', 'Retry with Microphone')}
          </button>
          <button onClick={handleGoToSymptomChecker} className="text-gray-400 text-sm underline">
            {t('voice.skipInstead', 'Select symptoms manually instead')}
          </button>
        </div>
      </div>
    )
  }

  // ── IDLE: show mic button + skip option ──────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">

          {micUnsupported ? (
            <>
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
            </>
          ) : (
            <>
              {/* Mic button — tap to start */}
              <button
                onClick={startListening}
                className="relative w-24 h-24 rounded-full bg-teal-500 flex items-center justify-center text-4xl mx-auto mb-6 hover:bg-teal-600 active:scale-95 transition-all shadow-lg"
                aria-label="Start voice input"
              >
                🎤
              </button>

              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {t('voice.speaking', 'Tell us what you feel')}
              </h2>
              <p className="text-gray-500 text-sm mb-2">
                {t('voice.speakNow', 'Tap the mic and speak your symptoms')}
              </p>
              <p className="text-gray-400 text-xs mb-6">
                {t('voice.example', 'e.g. "Mujhe bukhaar hai aur sar dard ho raha hai"')}
              </p>

              <button
                onClick={handleGoToSymptomChecker}
                className="flex items-center justify-center gap-2 w-full border-2 border-teal-400 text-teal-600 py-3 rounded-xl font-medium hover:bg-teal-50 active:scale-95 transition mt-2"
              >
                <span className="text-lg">📋</span>
                {t('voice.skip', 'Skip — select symptoms manually')}
              </button>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="flex items-center justify-center gap-2 w-full border-2 border-gray-200 text-gray-500 py-3 rounded-xl font-medium hover:bg-gray-50 active:scale-95 transition mt-2"
                >
                  <span className="text-lg">🏠</span>
                  {t('voice.goToDashboard', 'Go to Dashboard')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // ── LISTENING ────────────────────────────────────────────────────────────
  if (phase === 'listening') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">

          {/* Pulsing mic */}
          <div className="relative flex items-center justify-center mb-8">
            <span className="absolute w-28 h-28 rounded-full bg-teal-200 animate-ping opacity-50" />
            <span className="absolute w-22 h-22 rounded-full bg-teal-300 animate-ping opacity-30" style={{ animationDelay: '0.3s', width: '5.5rem', height: '5.5rem' }} />
            <button
              onClick={stopListening}
              className="relative z-10 w-20 h-20 rounded-full bg-teal-500 flex items-center justify-center text-3xl shadow-lg"
              aria-label="Stop listening"
            >
              🎤
            </button>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-1">
            {t('voice.listening', 'Listening...')}
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            {t('voice.speakNow', 'Speak your symptoms clearly')}
          </p>

          {transcript && (
            <div className="bg-teal-50 rounded-xl p-4 text-left mb-4">
              <p className="text-xs font-medium text-teal-700 mb-1">{t('voice.heard', 'Heard:')}</p>
              <p className="text-gray-700 text-sm">{transcript}</p>
              {interimText && (
                <p className="text-teal-400 text-sm italic mt-1">{interimText}...</p>
              )}
            </div>
          )}
          {!transcript && interimText && (
            <div className="bg-teal-50 rounded-xl p-4 text-left mb-4">
              <p className="text-teal-400 text-sm italic">{interimText}...</p>
            </div>
          )}

          <button onClick={stopListening} className="text-gray-400 text-sm underline">
            {t('voice.stopListening', 'Stop & Analyze')}
          </button>
        </div>
      </div>
    )
  }

  // ── PROCESSING ───────────────────────────────────────────────────────────
  if (phase === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {t('voice.analyzing', 'Analyzing your symptoms...')}
          </h2>
          <p className="text-gray-400 text-sm">
            {t('voice.wait', 'AI is processing your description')}
          </p>
        </div>
      </div>
    )
  }

  // ── RESULT ───────────────────────────────────────────────────────────────
  if (phase === 'result' && analysisResult) {
    const detectedList = Object.entries(analysisResult.symptoms)
      .filter(([, v]) => v === 1)
      .map(([k]) => k.replace(/_/g, ' '))

    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 p-4 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-4 pt-6 pb-10">

          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-gray-800">
              {t('analysis.title', 'Your Symptom Analysis')}
            </h1>
          </div>

          {analysisResult.priority === 'emergency' && (
            <div className="bg-red-500 text-white rounded-2xl p-4 text-center font-bold text-lg animate-pulse">
              ⚠️ {t('analysis.emergency', 'EMERGENCY — Seek Immediate Help')}
            </div>
          )}

          {/* Prediction */}
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">
              {t('analysis.prediction', 'Likely condition')}
            </p>
            <h2 className="text-xl font-bold text-teal-700">{analysisResult.prediction}</h2>
            {analysisResult.confidence > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{t('analysis.confidence', 'Confidence')}</span>
                  <span>{Math.round(analysisResult.confidence * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-teal-500 h-2 rounded-full"
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
                  <span key={s} className="bg-teal-100 text-teal-700 text-sm px-3 py-1 rounded-full capitalize">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Gemini summary */}
          {analysisResult.gemini_summary && (
            <div className="bg-white rounded-2xl shadow p-5">
              <p className="text-xs font-medium text-gray-400 uppercase mb-2">
                {t('analysis.aiAdvice', 'AI Health Advice')}
              </p>
              <p className="text-gray-700 text-sm leading-relaxed">{analysisResult.gemini_summary}</p>
            </div>
          )}

          {/* Priority */}
          <div className={`rounded-2xl border p-4 ${PRIORITY_COLORS[analysisResult.priority] || PRIORITY_COLORS.general}`}>
            <p className="text-xs font-medium uppercase mb-1">
              {t('analysis.queuePriority', 'Queue Priority')}
            </p>
            <p className="font-bold capitalize text-lg">{analysisResult.priority}</p>
          </div>

          {/* What you said */}
          <div className="bg-gray-50 rounded-2xl p-4 border">
            <p className="text-xs font-medium text-gray-400 uppercase mb-2">
              {t('analysis.youSaid', 'What you said')}
            </p>
            <p className="text-gray-600 text-sm italic">"{transcript}"</p>
          </div>

          {/* Actions */}
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
              onClick={handleRetry}
              className="w-full border border-gray-300 text-gray-600 py-3 rounded-2xl font-medium hover:bg-gray-50 transition"
            >
              🎤 {t('voice.retry', 'Try Again')}
            </button>
            <button
              onClick={handleSkip}
              className="w-full border border-gray-200 text-gray-500 py-3 rounded-2xl font-medium hover:bg-gray-50 transition text-sm"
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
