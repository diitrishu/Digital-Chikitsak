/**
 * PatientTokensPage — /patient/tokens
 * Shows the patient's active queue token and live position.
 * If no active token, shows a message and link to start consultation.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, Users, Phone, Wifi, WifiOff, RefreshCw, Stethoscope } from 'lucide-react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import { supabase } from '../../shared/services/supabase'
import { useQueue } from '../hooks/useQueue'

const PRIORITY_CONFIG = {
  emergency: { label: 'Emergency', color: 'bg-red-100 text-red-700 border-red-200' },
  senior:    { label: 'Senior',    color: 'bg-orange-100 text-orange-700 border-orange-200' },
  child:     { label: 'Child',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  general:   { label: 'General',   color: 'bg-green-100 text-green-700 border-green-200' },
}

function QueueView({ token, onCancel }) {
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
      {isMyTurn && jitsiRoomId && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-green-500 rounded-2xl p-5 text-white text-center">
          <div className="text-3xl mb-2">🎉</div>
          <h3 className="text-xl font-bold">It's Your Turn!</h3>
          <p className="text-green-100 text-sm mt-1 mb-4">Your doctor is ready</p>
          <a href={`https://meet.jit.si/${jitsiRoomId}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-green-600 font-bold px-6 py-3 rounded-xl">
            <Phone size={18} /> Join Video Call
          </a>
        </motion.div>
      )}

      {/* Token card */}
      {!isMyTurn && (
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

          <div className="grid grid-cols-2 gap-3 mb-3">
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
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center text-yellow-700 text-sm font-medium mb-3">
              ⚡ You're next! Please be ready.
            </div>
          )}

          {token?.symptoms_summary && (
            <p className="text-xs text-gray-400 mb-3">Symptoms: {token.symptoms_summary}</p>
          )}

          <div className="flex gap-2">
            <button onClick={refresh}
              className="flex-1 flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-gray-600 py-2 border border-gray-200 rounded-xl">
              <RefreshCw size={12} /> Refresh
            </button>
            <button onClick={onCancel}
              className="flex-1 text-xs text-red-400 hover:text-red-600 py-2 border border-red-100 rounded-xl">
              Leave Queue
            </button>
          </div>
        </div>
      )}

      {/* Queue list */}
      {queue.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-700">Queue ({queue.length} waiting)</p>
          </div>
          {queue.slice(0, 5).map((t) => {
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
    </div>
  )
}

export default function PatientTokensPage() {
  const navigate = useNavigate()
  const [activeToken, setActiveToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadToken() {
      // 1. Check localStorage first (fast)
      try {
        const stored = JSON.parse(localStorage.getItem('activeToken'))
        if (stored?.id) { setActiveToken(stored); setLoading(false); return }
      } catch {}

      // 2. Look up in Supabase by patient phone
      const user = JSON.parse(localStorage.getItem('user') || 'null')
      if (!user?.phone) { setLoading(false); return }

      const { data: patient } = await supabase
        .from('patients').select('id').eq('phone', user.phone).maybeSingle()
      if (!patient) { setLoading(false); return }

      const { data: token } = await supabase
        .from('tokens')
        .select('*, doctors(name, specialization, avg_consult_time)')
        .eq('patient_id', patient.id)
        .in('status', ['waiting', 'in_consultation'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (token) {
        setActiveToken(token)
        localStorage.setItem('activeToken', JSON.stringify(token))
      }
      setLoading(false)
    }
    loadToken()
  }, [])

  const handleCancel = async () => {
    if (!activeToken) return
    if (!window.confirm('Leave the queue? You will lose your position.')) return
    await supabase.from('tokens').update({ status: 'done' }).eq('id', activeToken.id)
    setActiveToken(null)
    localStorage.removeItem('activeToken')
    toast.success('Left the queue')
  }

  if (loading) {
    return (
      <AppShell title="My Tokens">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="My Tokens">
      <div className="max-w-lg mx-auto px-4 py-5">
        <h2 className="text-xl font-bold text-gray-800 mb-5">My Queue Status</h2>

        {activeToken ? (
          <QueueView token={activeToken} onCancel={handleCancel} />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <Stethoscope size={40} className="text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No active token</h3>
            <p className="text-gray-400 text-sm mb-6">You're not currently in any doctor's queue.</p>
            <button
              onClick={() => navigate('/patient/symptom-checker')}
              className="bg-teal-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-teal-600 transition">
              Start Consultation
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
