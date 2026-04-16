/**
 * SmartConsultation — Multilingual AI Conversation Symptom Checker
 * - Tap-to-speak or type in Hindi, Khortha, Bengali, Nagpuri, English
 * - Gemini detects language and replies in same language/tone
 * - Format: Cause → Home remedy → OTC medicine (after 2 exchanges) → Doctor when
 * - Emergency detection → red alert + 108
 * - After AI chat → seamlessly join doctor queue
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Send, AlertTriangle, Loader,
  Users, Phone, Wifi, WifiOff, RefreshCw,
  Activity, ChevronRight, Check, X, Stethoscope,
  MessageCircle, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import { supabase } from '../../shared/services/supabase'
import { triage, extractSymptoms, symptomsToMLPayload } from '../services/triage'
import { generateToken, getJitsiRoomId, findBestDoctor } from '../services/queueService'
import { useQueue } from '../hooks/useQueue'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Quick chips (multilingual labels) ───────────────────────────────────────
const QUICK_CHIPS = [
  { key: 'fever',        hi: 'Bukhar 🌡️',      en: 'Fever 🌡️' },
  { key: 'stomach_pain', hi: 'Pet Dard 🤢',     en: 'Stomach Pain 🤢' },
  { key: 'headache',     hi: 'Sar Dard 🤕',     en: 'Headache 🤕' },
  { key: 'cough',        hi: 'Khansi 😮‍💨',      en: 'Cough 😮‍💨' },
  { key: 'fatigue',      hi: 'Kamzori 😴',      en: 'Fatigue 😴' },
  { key: 'dizziness',    hi: 'Chakkar 😵',      en: 'Dizziness 😵' },
  { key: 'vomiting',     hi: 'Ulti 🤮',         en: 'Vomiting 🤮' },
  { key: 'diarrhea',     hi: 'Dast 🚽',         en: 'Diarrhea 🚽' },
  { key: 'rash',         hi: 'Daane 🔴',        en: 'Rash 🔴' },
  { key: 'chest_pain',   hi: 'Seene Dard 💔',   en: 'Chest Pain 💔' },
  { key: 'joint_pain',   hi: 'Jod Dard 🦴',     en: 'Joint Pain 🦴' },
  { key: 'sore_throat',  hi: 'Gala Dard 🤒',    en: 'Sore Throat 🤒' },
]

// Speech recognition language codes — try multiple for better coverage
const SPEECH_LANGS = ['hi-IN', 'bn-IN', 'en-IN']

const PRIORITY_CONFIG = {
  emergency: { label: 'Emergency',  color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  senior:    { label: 'Senior',     color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  child:     { label: 'Child',      color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  general:   { label: 'General',    color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
}

// ── Queue view ───────────────────────────────────────────────────────────────
function QueueView({ token, onNewConsultation }) {
  const { queue, myPosition, estimatedWait, isMyTurn, jitsiRoomId, channelStatus, refresh } =
    useQueue(token?.doctor_id, token?.id, token?.token_number)
  const pc = PRIORITY_CONFIG[token?.priority] || PRIORITY_CONFIG.general

  return (
    <div className="space-y-4">
      <div className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ${
        channelStatus === 'SUBSCRIBED' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
      }`}>
        {channelStatus === 'SUBSCRIBED' ? <Wifi size={12} /> : <WifiOff size={12} />}
        {channelStatus === 'SUBSCRIBED' ? 'Live updates' : 'Reconnecting…'}
      </div>

      <AnimatePresence>
        {((isMyTurn && jitsiRoomId) || (token?.status === 'in_consultation' && token?.jitsi_room)) && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500 rounded-2xl p-5 text-white text-center">
            <div className="text-3xl mb-2">🎉</div>
            <h3 className="text-xl font-bold">Aapki baari aa gayi!</h3>
            <p className="text-green-100 text-sm mt-1 mb-4">Doctor ready hain</p>
            <a href={`https://meet.jit.si/${jitsiRoomId || token?.jitsi_room}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-green-600 font-bold px-6 py-3 rounded-xl">
              <Phone size={18} /> Video Call Join Karein
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {(!isMyTurn && token?.status !== 'in_consultation') && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Token Number</p>
              <p className="text-5xl font-black text-teal-600 leading-none mt-1">#{token?.token_number}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${pc.color}`}>{pc.label}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <Users size={18} className="text-gray-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{myPosition}</p>
              <p className="text-xs text-gray-400">aage hain</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <Clock size={18} className="text-gray-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{estimatedWait}</p>
              <p className="text-xs text-gray-400">min wait</p>
            </div>
          </div>
          {myPosition === 0 && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center text-yellow-700 text-sm font-medium">
              ⚡ Aap next hain! Taiyaar rahein.
            </div>
          )}
          <button onClick={refresh} className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-gray-600 py-2">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      )}

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
                {isMe && <span className="text-teal-600 text-xs font-semibold">← Aap</span>}
              </div>
            )
          })}
        </div>
      )}

      <button onClick={onNewConsultation}
        className="w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
        Nayi Consultation Shuru Karein
      </button>
    </div>
  )
}

// ── Chat bubble ──────────────────────────────────────────────────────────────
function ChatBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
          AI
        </div>
      )}
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-teal-500 text-white rounded-tr-sm'
          : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-sm'
      }`}>
        {msg.content}
      </div>
    </motion.div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function SmartConsultation() {
  const [mode, setMode] = useState('chat') // 'chat' | 'queue'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isEmergency, setIsEmergency] = useState(false)
  const [exchangeCount, setExchangeCount] = useState(0)
  const [symptomsDetected, setSymptomsDetected] = useState([])
  const [showJoinDoctor, setShowJoinDoctor] = useState(false)
  const [joiningQueue, setJoiningQueue] = useState(false)
  const [activeToken, setActiveToken] = useState(() => {
    try { return JSON.parse(localStorage.getItem('activeToken')) } catch { return null }
  })
  const [patientInfo, setPatientInfo] = useState(null)
  const [speechLangIdx, setSpeechLangIdx] = useState(0)

  const recognitionRef = useRef(null)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  // If active token exists, go to queue
  useEffect(() => {
    if (activeToken?.id) setMode('queue')
  }, [])

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Resolve patient
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

  // Show "Join Doctor" button after 2 exchanges
  useEffect(() => {
    if (exchangeCount >= 2 && !isEmergency) setShowJoinDoctor(true)
  }, [exchangeCount, isEmergency])

  // Welcome message
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: 'Namaste! 🙏 Main Chikitsak AI hoon.\n\nAap apni takleef Hindi, English, ya kisi bhi bhasha mein bata sakte hain. Mic tap karein ya type karein.\n\nKya takleef hai aapko?'
    }])
  }, [])

  // Speech recognition setup
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { toast.error('Voice not supported on this browser'); return }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
    }

    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = SPEECH_LANGS[speechLangIdx]
    rec.maxAlternatives = 3

    let finalTranscript = ''
    let interimTranscript = ''

    rec.onstart = () => setIsListening(true)

    rec.onresult = (e) => {
      finalTranscript = ''
      interimTranscript = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript
        } else {
          interimTranscript += e.results[i][0].transcript
        }
      }
      if (interimTranscript) setInput(interimTranscript)
      if (finalTranscript) setInput(prev => prev ? `${prev} ${finalTranscript}` : finalTranscript)
    }

    rec.onerror = (e) => {
      setIsListening(false)
      if (e.error === 'not-allowed') {
        toast.error('Microphone permission denied')
      } else if (e.error === 'no-speech') {
        // Try next language
        const nextIdx = (speechLangIdx + 1) % SPEECH_LANGS.length
        setSpeechLangIdx(nextIdx)
        toast('Koi awaaz nahi mili. Dobara try karein.', { icon: '🎤' })
      }
    }

    rec.onend = () => {
      setIsListening(false)
      if (finalTranscript.trim()) {
        setInput(finalTranscript.trim())
      }
    }

    recognitionRef.current = rec
    rec.start()
    toast('Sun raha hoon... 🎤', { duration: 2000 })
  }, [speechLangIdx])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }, [])

  const toggleListen = () => {
    if (isListening) stopListening()
    else startListening()
  }

  // Send message to AI
  const sendMessage = async (text) => {
    const msg = (text || input).trim()
    if (!msg || isLoading) return

    setInput('')
    setIsListening(false)

    const userMsg = { role: 'user', content: msg }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')
      const history = newMessages.slice(1, -1).map(m => ({ role: m.role, content: m.content }))

      const res = await fetch(`${API_URL}/ai/chat-symptom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: msg,
          history,
          patient_id: patientInfo?.id || null,
        })
      })

      if (!res.ok) throw new Error('API error')
      const data = await res.json()

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      setExchangeCount(data.exchange_count || exchangeCount + 1)
      setSymptomsDetected(data.symptoms_detected || [])

      if (data.is_emergency) {
        setIsEmergency(true)
        setShowJoinDoctor(false)
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Maafi chahta hoon, abhi AI service available nahi hai. Kripya thodi der baad try karein ya seedha doctor se milein.'
      }])
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleChipTap = (chip) => {
    sendMessage(chip.hi)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Join doctor queue
  const handleJoinQueue = async () => {
    if (!patientInfo?.id) { toast.error('Please log in first'); return }
    setJoiningQueue(true)

    try {
      const symptomList = symptomsDetected.length > 0 ? symptomsDetected : ['general']
      const triageResult = triage({ symptoms: symptomList, age: patientInfo?.age || null })

      const doctor = await findBestDoctor(triageResult.specialization)
      if (doctor && doctor.waitingCount === 0 && doctor.status === 'online') {
        const jitsiRoom = getJitsiRoomId(Date.now().toString())
        const { data: maxRow } = await supabase.from('tokens')
          .select('token_number').eq('doctor_id', doctor.id)
          .order('token_number', { ascending: false }).limit(1).maybeSingle()
        const tokenNumber = maxRow ? maxRow.token_number + 1 : 1
        const { data: token, error: insertErr } = await supabase.from('tokens')
          .insert({
            token_number: tokenNumber,
            patient_id: patientInfo.id,
            doctor_id: doctor.id,
            status: 'in_consultation',
            priority: triageResult.priority,
            symptoms_summary: symptomList.join(', '),
            jitsi_room: jitsiRoom,
            called_at: new Date().toISOString()
          }).select('*, doctors(name, specialization, avg_consult_time)').single()

        if (!insertErr && token) {
          await supabase.from('doctors').update({ status: 'in_call', current_patient_id: patientInfo.id }).eq('id', doctor.id)
          setActiveToken(token)
          localStorage.setItem('activeToken', JSON.stringify(token))
          toast.success('Doctor available hai! Call join karein.')
          setMode('queue')
          return
        }
      }

      const token = await generateToken({
        patientId: patientInfo.id,
        priority: triageResult.priority,
        specialization: triageResult.specialization,
        symptomsSummary: symptomList.join(', '),
      })
      setActiveToken(token)
      localStorage.setItem('activeToken', JSON.stringify(token))
      toast.success(`Token #${token.token_number} mila!`)
      setMode('queue')
    } catch (err) {
      if (err.code === 409) toast.error('Aapka ek token already active hai')
      else if (err.code === 503) toast.error('Abhi koi doctor available nahi hai')
      else toast.error(err.message || 'Token generate nahi hua')
    } finally {
      setJoiningQueue(false)
    }
  }

  const handleNewConsultation = () => {
    setActiveToken(null)
    localStorage.removeItem('activeToken')
    setMode('chat')
    setMessages([{
      role: 'assistant',
      content: 'Namaste! 🙏 Main Chikitsak AI hoon.\n\nAap apni takleef Hindi, English, ya kisi bhi bhasha mein bata sakte hain.\n\nKya takleef hai aapko?'
    }])
    setExchangeCount(0)
    setSymptomsDetected([])
    setIsEmergency(false)
    setShowJoinDoctor(false)
    setInput('')
  }

  // ── QUEUE MODE ───────────────────────────────────────────────────────────
  if (mode === 'queue' && activeToken) {
    return (
      <AppShell title="Queue">
        <div className="max-w-lg mx-auto px-4 py-5">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-800">Aapki Queue</h2>
            <p className="text-gray-400 text-sm mt-1">Live updates — refresh ki zaroorat nahi</p>
          </div>
          <QueueView token={activeToken} onNewConsultation={handleNewConsultation} />
        </div>
      </AppShell>
    )
  }

  // ── CHAT MODE ────────────────────────────────────────────────────────────
  return (
    <AppShell title="AI Health Chat">
      <div className="max-w-lg mx-auto flex flex-col h-[calc(100vh-7rem)]">

        {/* Emergency banner */}
        <AnimatePresence>
          {isEmergency && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mt-3 bg-red-500 text-white rounded-2xl p-4 text-center"
            >
              <div className="text-2xl mb-1">🚨</div>
              <p className="font-bold text-lg">EMERGENCY!</p>
              <p className="text-sm text-red-100 mb-3">Turant ambulance bulayein</p>
              <a href="tel:108"
                className="inline-flex items-center gap-2 bg-white text-red-600 font-bold px-6 py-2 rounded-xl text-lg">
                📞 108 Call Karein
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {messages.map((msg, i) => (
            <ChatBubble key={i} msg={msg} />
          ))}

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-3">
              <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">AI</div>
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick chips — show only at start */}
        {exchangeCount === 0 && !isLoading && (
          <div className="px-4 pb-2">
            <p className="text-xs text-gray-400 mb-2 font-medium">Jaldi select karein:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_CHIPS.map(chip => (
                <button
                  key={chip.key}
                  onClick={() => handleChipTap(chip)}
                  className="px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-sm font-medium hover:bg-teal-100 active:scale-95 transition-all"
                >
                  {chip.hi}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Join doctor button */}
        <AnimatePresence>
          {showJoinDoctor && !isEmergency && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-4 pb-2"
            >
              <button
                onClick={handleJoinQueue}
                disabled={joiningQueue}
                className="w-full bg-teal-500 text-white font-semibold py-3 rounded-xl hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                {joiningQueue
                  ? <><Loader size={16} className="animate-spin" /> Doctor dhundh rahe hain...</>
                  : <><Users size={18} /> Doctor se Milein <ChevronRight size={16} /></>
                }
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-white">
          <div className="flex gap-2 items-end">
            <button
              onClick={toggleListen}
              className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200'
                  : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
              }`}
              title={isListening ? 'Stop listening' : 'Tap to speak'}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hindi, English ya kisi bhi bhasha mein likhein..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none pr-10"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>

            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="w-11 h-11 rounded-xl bg-teal-500 text-white flex items-center justify-center flex-shrink-0 hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </div>

          {isListening && (
            <div className="flex items-center gap-2 mt-2 text-red-500 text-xs">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Sun raha hoon... Hindi, Bengali, ya English mein bolein
            </div>
          )}

          {exchangeCount > 0 && (
            <p className="text-center text-xs text-gray-300 mt-2">
              {exchangeCount} message{exchangeCount > 1 ? 's' : ''} exchanged
              {exchangeCount >= 2 && !showJoinDoctor && ' · '}
            </p>
          )}
        </div>
      </div>
    </AppShell>
  )
}

