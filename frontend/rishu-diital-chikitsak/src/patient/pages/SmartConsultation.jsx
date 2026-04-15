/**
 * Smart Consultation — Unified 4-step flow
 * Step 1: Input (voice + text + quick tap)
 * Step 2: Confirm detected symptoms + triage result
 * Step 3: AI prediction + decision (queue or self-care)
 * Step 4: Live queue status
 */
import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Send, Check, X, ChevronRight,
  AlertTriangle, Loader, Stethoscope, Clock,
  Users, Phone, Wifi, WifiOff, RefreshCw,
  Activity, Heart, Thermometer, Wind, Droplets
} from 'lucide-react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import { supabase } from '../../shared/services/supabase'
import { triage, extractSymptoms, symptomsToMLPayload } from '../services/triage'
import { generateToken, getOnlineDoctors, getJitsiRoomId, findBestDoctor } from '../services/queueService'
import { useQueue } from '../hooks/useQueue'

// ── Quick-tap symptom chips ──────────────────────────────────────────────────
const QUICK_SYMPTOMS = [
  { key: 'fever',            label: 'Fever',           emoji: '🌡️' },
  { key: 'cough',            label: 'Cough',           emoji: '😮‍💨' },
  { key: 'headache',         label: 'Headache',        emoji: '🤕' },
  { key: 'stomach_pain',     label: 'Stomach Pain',    emoji: '🤢' },
  { key: 'fatigue',          label: 'Fatigue',         emoji: '😴' },
  { key: 'shortness_breath', label: 'Breathlessness',  emoji: '😮' },
  { key: 'sore_throat',      label: 'Sore Throat',     emoji: '🤒' },
  { key: 'joint_pain',       label: 'Joint Pain',      emoji: '🦴' },
  { key: 'rash',             label: 'Rash',            emoji: '🔴' },
  { key: 'diarrhea',         label: 'Diarrhea',        emoji: '🚽' },
  { key: 'vomiting',         label: 'Vomiting',        emoji: '🤮' },
  { key: 'chest_pain',       label: 'Chest Pain',      emoji: '💔' },
]

const PRIORITY_CONFIG = {
  emergency: { label: 'Emergency',  color: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-500' },
  senior:    { label: 'Senior',     color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  child:     { label: 'Child',      color: 'bg-blue-100 text-blue-700 border-blue-200',  dot: 'bg-blue-500' },
  general:   { label: 'General',    color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
}

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

const STEPS = ['input', 'confirm', 'result', 'queue']

// ── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ current }) {
  const labels = ['Describe', 'Confirm', 'Analysis', 'Queue']
  const idx = STEPS.indexOf(current)
  return (
    <div className="flex items-center gap-0 mb-6">
      {labels.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < idx ? 'bg-teal-500 text-white' :
              i === idx ? 'bg-teal-500 text-white ring-4 ring-teal-100' :
              'bg-gray-100 text-gray-400'
            }`}>
              {i < idx ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-[10px] mt-1 font-medium ${i === idx ? 'text-teal-600' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mb-4 transition-all ${i < idx ? 'bg-teal-500' : 'bg-gray-100'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ── Queue view (step 4) ──────────────────────────────────────────────────────
function QueueView({ token, onNewConsultation }) {
  const { queue, myPosition, estimatedWait, isMyTurn, jitsiRoomId, channelStatus, refresh } =
    useQueue(token?.doctor_id, token?.id, token?.token_number)

  const pc = PRIORITY_CONFIG[token?.priority] || PRIORITY_CONFIG.general

  return (
    <div className="space-y-4">
      {/* Connection pill */}
      <div className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ${
        channelStatus === 'SUBSCRIBED' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
      }`}>
        {channelStatus === 'SUBSCRIBED' ? <Wifi size={12} /> : <WifiOff size={12} />}
        {channelStatus === 'SUBSCRIBED' ? 'Live updates' : 'Reconnecting…'}
      </div>

      {/* Your turn */}
      <AnimatePresence>
        {((isMyTurn && jitsiRoomId) || (token?.status === 'in_consultation' && token?.jitsi_room)) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500 rounded-2xl p-5 text-white text-center"
          >
            <div className="text-3xl mb-2">🎉</div>
            <h3 className="text-xl font-bold">It's Your Turn!</h3>
            <p className="text-green-100 text-sm mt-1 mb-4">Your doctor is ready</p>
            <a
              href={`https://meet.jit.si/${jitsiRoomId || token?.jitsi_room}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-green-600 font-bold px-6 py-3 rounded-xl"
            >
              <Phone size={18} />
              Join Video Call
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Token card */}
      {(!isMyTurn && token?.status !== 'in_consultation') && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Token Number</p>
              <p className="text-5xl font-black text-teal-600 leading-none mt-1">#{token?.token_number}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${pc.color}`}>
              {pc.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <Users size={18} className="text-gray-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{myPosition}</p>
              <p className="text-xs text-gray-400">ahead of you</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <Clock size={18} className="text-gray-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{estimatedWait}</p>
              <p className="text-xs text-gray-400">min wait</p>
            </div>
          </div>

          {myPosition === 0 && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center text-yellow-700 text-sm font-medium">
              ⚡ You're next! Please be ready.
            </div>
          )}

          <button onClick={refresh} className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-gray-600 py-2">
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      )}

      {/* Queue list */}
      {queue.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-700">Queue ({queue.length} waiting)</p>
          </div>
          {queue.slice(0, 4).map((t) => {
            const p = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.general
            const isMe = t.id === token?.id
            return (
              <div key={t.id} className={`flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 ${isMe ? 'bg-teal-50' : ''}`}>
                <span className="font-mono font-bold text-gray-600 text-sm">#{t.token_number}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.color}`}>{p.label}</span>
                {isMe && <span className="text-teal-600 text-xs font-semibold">← You</span>}
              </div>
            )
          })}
        </div>
      )}

      <button
        onClick={onNewConsultation}
        className="w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
      >
        Start New Consultation
      </button>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function SmartConsultation() {
  const [step, setStep] = useState('input')
  const [textInput, setTextInput] = useState('')
  const [tappedSymptoms, setTappedSymptoms] = useState(new Set())
  const [extractedSymptoms, setExtractedSymptoms] = useState([])
  const [triageResult, setTriageResult] = useState(null)
  const [mlResult, setMlResult] = useState(null)
  const [activeToken, setActiveToken] = useState(() => {
    try { return JSON.parse(localStorage.getItem('activeToken')) } catch { return null }
  })
  const [patientInfo, setPatientInfo] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processingMsg, setProcessingMsg] = useState('')
  const recognitionRef = useRef(null)

  // If there's an active token, go straight to queue
  useEffect(() => {
    if (activeToken?.id) setStep('queue')
  }, [])

  // Resolve patient from Supabase
  useEffect(() => {
    async function resolve() {
      const user = JSON.parse(localStorage.getItem('user') || 'null')
      if (!user?.phone) return
      const { data } = await supabase.from('patients').select('id,name,age,phone').eq('phone', user.phone).maybeSingle()
      if (data) { setPatientInfo(data); return }
      const { data: created } = await supabase.from('patients')
        .upsert({ name: user.name || user.phone, phone: user.phone, age: null }, { onConflict: 'phone' })
        .select('id,name,age,phone').single()
      if (created) setPatientInfo(created)
    }
    resolve()
  }, [])

  // Speech recognition
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'pa-IN'
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript
      setTextInput(prev => prev ? `${prev} ${t}` : t)
      toast.success('Voice captured')
    }
    rec.onerror = () => setIsListening(false)
    rec.onend = () => setIsListening(false)
    recognitionRef.current = rec
    return () => rec.abort()
  }, [])

  const toggleListen = () => {
    if (!recognitionRef.current) { toast.error('Voice not supported'); return }
    if (isListening) { recognitionRef.current.stop(); setIsListening(false) }
    else { recognitionRef.current.start(); setIsListening(true); toast('Listening…', { icon: '🎤' }) }
  }

  const toggleTap = (key) => {
    setTappedSymptoms(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  }

  // Step 1 → 2: extract + triage
  const handleAnalyze = () => {
    const fromText = extractSymptoms(textInput)
    const all = Array.from(new Set([...fromText, ...Array.from(tappedSymptoms)]))
    if (all.length === 0) { toast.error('Please describe or select at least one symptom'); return }
    const age = patientInfo?.age || null
    const result = triage({ symptoms: all, age })
    setExtractedSymptoms(all)
    setTriageResult(result)
    setStep('confirm')
  }

  // Step 2 → 3: save + ML
  const handleConfirm = async () => {
    setProcessing(true)
    setProcessingMsg('Saving symptoms…')

    // Save to Supabase (non-blocking)
    let symptomRowId = null
    if (patientInfo?.id) {
      const { data } = await supabase.from('symptoms').insert({
        patient_id: patientInfo.id,
        symptoms_json: { raw_text: textInput, symptoms: extractedSymptoms },
        ml_prediction: null,
      }).select('id').single()
      symptomRowId = data?.id
    }

    // Call ML API
    setProcessingMsg('Analyzing with AI…')
    let ml = null
    try {
      const payload = symptomsToMLPayload(extractedSymptoms)
      const res = await fetch(
        `${import.meta.env.VITE_PREDICTOR_URL || 'http://localhost:5001/api/v1'}/predict`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symptoms: payload }), signal: AbortSignal.timeout(10000) }
      )
      if (res.ok) {
        ml = await res.json()
        setMlResult(ml)
        if (symptomRowId) {
          await supabase.from('symptoms').update({ ml_prediction: JSON.stringify(ml) }).eq('id', symptomRowId)
        }
      }
    } catch { /* ML failure is non-fatal */ }

    setProcessing(false)
    setStep('result')
  }

  // Step 3 → 4: generate token
  const handleJoinQueue = async () => {
    if (!patientInfo?.id) { toast.error('Please log in first'); return }
    setProcessing(true)
    setProcessingMsg('Finding best doctor…')
    try {
      // 1. Try to find a completely free doctor for instant call
      const doctor = await findBestDoctor(triageResult.specialization)
      if (doctor && doctor.waitingCount === 0 && doctor.status === 'online') {
          // Attempt instant assignment
          const jitsiRoom = getJitsiRoomId(Date.now().toString())
          const { data: maxRow } = await supabase.from('tokens')
            .select('token_number').eq('doctor_id', doctor.id).order('token_number', { ascending: false }).limit(1).maybeSingle()
          
          const tokenNumber = maxRow ? maxRow.token_number + 1 : 1
          const { data: token, error: insertErr } = await supabase.from('tokens')
            .insert({
              token_number: tokenNumber,
              patient_id: patientInfo.id,
              doctor_id: doctor.id,
              status: 'in_consultation',
              priority: triageResult.priority,
              symptoms_summary: extractedSymptoms.join(', '),
              jitsi_room: jitsiRoom,
              called_at: new Date().toISOString()
            }).select('*, doctors(name, specialization, avg_consult_time)').single()
          
          if (!insertErr && token) {
            await supabase.from('doctors').update({ status: 'in_call', current_patient_id: patientInfo.id }).eq('id', doctor.id)
            setActiveToken(token)
            localStorage.setItem('activeToken', JSON.stringify(token))
            toast.success(`Doctor available now! Joining call...`)
            setStep('queue')
            setProcessing(false)
            return
          }
      }

      // 2. Fall back to queue
      const token = await generateToken({
        patientId: patientInfo.id,
        priority: triageResult.priority,
        specialization: triageResult.specialization,
        symptomsSummary: extractedSymptoms.join(', '),
      })
      setActiveToken(token)
      localStorage.setItem('activeToken', JSON.stringify(token))
      toast.success(`Token #${token.token_number} generated!`)
      setStep('queue')
    } catch (err) {
      if (err.code === 409) toast.error('You already have an active token')
      else if (err.code === 503) toast.error('No doctors available right now')
      else toast.error(err.message || 'Failed to generate token')
    } finally {
      setProcessing(false)
    }
  }

  const handleNewConsultation = () => {
    setActiveToken(null)
    localStorage.removeItem('activeToken')
    setStep('input')
    setTextInput('')
    setTappedSymptoms(new Set())
    setExtractedSymptoms([])
    setTriageResult(null)
    setMlResult(null)
  }

  const pc = triageResult ? PRIORITY_CONFIG[triageResult.priority] : null

  return (
    <AppShell title="Consultation">
      <div className="max-w-lg mx-auto px-4 py-5">
        {step !== 'queue' && <StepBar current={step} />}

        <AnimatePresence mode="wait">

          {/* ── STEP 1: INPUT ─────────────────────────────── */}
          {step === 'input' && (
            <motion.div key="input" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">How are you feeling?</h2>
                <p className="text-gray-400 text-sm mt-1">Speak, type, or tap your symptoms below</p>
              </div>

              {/* Voice + text */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex gap-3 mb-3">
                  <button
                    onClick={toggleListen}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                    }`}
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  <textarea
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    placeholder="e.g. I have fever and cough since 2 days…"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                    rows={3}
                  />
                </div>
                {isListening && (
                  <div className="flex items-center gap-2 text-red-500 text-xs">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Listening… speak clearly in Punjabi, Hindi or English
                  </div>
                )}
              </div>

              {/* Quick tap chips */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Select</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_SYMPTOMS.map(({ key, label, emoji }) => (
                    <button
                      key={key}
                      onClick={() => toggleTap(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        tappedSymptoms.has(key)
                          ? 'bg-teal-500 text-white border-teal-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
                      }`}
                    >
                      <span>{emoji}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!textInput.trim() && tappedSymptoms.size === 0}
                className="w-full bg-teal-500 text-white font-semibold py-3.5 rounded-xl hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                Analyze Symptoms
                <ChevronRight size={18} />
              </button>
            </motion.div>
          )}

          {/* ── STEP 2: CONFIRM ───────────────────────────── */}
          {step === 'confirm' && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Confirm Symptoms</h2>
                <p className="text-gray-400 text-sm mt-1">Review before we proceed</p>
              </div>

              {/* Triage result */}
              {pc && (
                <div className={`rounded-2xl border p-4 ${pc.color}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${pc.dot}`} />
                    <span className="font-semibold text-sm">{pc.label} Priority</span>
                  </div>
                  <p className="text-sm opacity-80">{triageResult.reasoning}</p>
                  <p className="text-xs mt-1 opacity-70">
                    Routing to: <strong>{SPEC_LABELS[triageResult.specialization] || triageResult.specialization}</strong>
                  </p>
                </div>
              )}

              {/* Symptom chips */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Detected Symptoms</p>
                <div className="flex flex-wrap gap-2">
                  {extractedSymptoms.map(sym => (
                    <span key={sym} className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1.5 rounded-full text-sm font-medium">
                      <Check size={12} />
                      {sym.replace(/_/g, ' ')}
                      <button onClick={() => setExtractedSymptoms(prev => prev.filter(s => s !== sym))} className="hover:text-red-500 ml-0.5">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                {extractedSymptoms.length === 0 && (
                  <p className="text-sm text-gray-400">All symptoms removed. Go back to re-enter.</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={extractedSymptoms.length === 0 || processing}
                  className="flex-1 bg-teal-500 text-white font-semibold py-3 rounded-xl hover:bg-teal-600 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
                >
                  {processing ? <><Loader size={16} className="animate-spin" /> {processingMsg}</> : <>Confirm <ChevronRight size={16} /></>}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: RESULT ────────────────────────────── */}
          {step === 'result' && (
            <motion.div key="result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">AI Analysis</h2>
                <p className="text-gray-400 text-sm mt-1">Based on your symptoms</p>
              </div>

              {/* ML result card */}
              {mlResult ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Possible Condition</p>
                      <p className="text-2xl font-bold text-gray-800 mt-1">{mlResult.predicted_disease}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Confidence</p>
                      <p className="text-2xl font-bold text-teal-600">{mlResult.confidence}%</p>
                    </div>
                  </div>

                  {/* Confidence bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-teal-500 h-2 rounded-full transition-all"
                      style={{ width: `${mlResult.confidence}%` }}
                    />
                  </div>

                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-green-700 mb-1">Suggested Care</p>
                    <p className="text-sm text-green-800">{mlResult.remedy}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-700">
                  AI analysis unavailable — a doctor will review your symptoms.
                </div>
              )}

              {/* Triage summary */}
              {pc && (
                <div className={`rounded-2xl border p-4 ${pc.color}`}>
                  <p className="font-semibold text-sm">{pc.label} Priority · {SPEC_LABELS[triageResult.specialization]}</p>
                  <p className="text-xs opacity-80 mt-0.5">{triageResult.reasoning}</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleJoinQueue}
                  disabled={processing}
                  className="w-full bg-teal-500 text-white font-semibold py-3.5 rounded-xl hover:bg-teal-600 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
                >
                  {processing
                    ? <><Loader size={16} className="animate-spin" /> {processingMsg}</>
                    : <><Users size={18} /> Join Doctor Queue</>
                  }
                </button>
                <button
                  onClick={handleNewConsultation}
                  className="w-full py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Self-care only (skip queue)
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: QUEUE ─────────────────────────────── */}
          {step === 'queue' && activeToken && (
            <motion.div key="queue" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-gray-800">Your Queue</h2>
                <p className="text-gray-400 text-sm mt-1">Live updates — no need to refresh</p>
              </div>
              <QueueView token={activeToken} onNewConsultation={handleNewConsultation} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </AppShell>
  )
}
