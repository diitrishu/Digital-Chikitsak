/**
 * DoctorTokensPage — /doctor/tokens
 *
 * Replaces the old axios-based stub completely.
 * Uses useDoctorQueue hook for live Supabase Realtime updates.
 * No polling. No axios. No hardcoded data.
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Phone, CheckCircle, Clock, Wifi, WifiOff,
  ChevronRight, AlertTriangle, Stethoscope, Activity
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import DoctorShell from '../components/DoctorShell'
import { useDoctorQueue } from '../hooks/useDoctorQueue'

const PRIORITY_STYLES = {
  emergency: { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-300',    label: '🚨 Emergency', dot: 'bg-red-500' },
  senior:    { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', label: '👴 Senior',    dot: 'bg-orange-500' },
  child:     { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300',   label: '👶 Child',     dot: 'bg-blue-500' },
  general:   { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300',  label: '✅ General',   dot: 'bg-green-500' },
}

const STATUS_CONFIG = {
  online:   { color: 'bg-green-500',  label: 'Online',   ring: 'ring-green-300' },
  in_call:  { color: 'bg-blue-500',   label: 'In Call',  ring: 'ring-blue-300' },
  break:    { color: 'bg-yellow-500', label: 'On Break', ring: 'ring-yellow-300' },
  offline:  { color: 'bg-gray-400',   label: 'Offline',  ring: 'ring-gray-300' },
}

// ── Patient info card with expandable details ────────────────────────────────
function PatientInfoCard({ token, onCall }) {
  const [expanded, setExpanded] = useState(false)

  const symptoms = token.symptoms_json || token.symptoms || {}
  const detectedSymptoms = typeof symptoms === 'object' && !Array.isArray(symptoms)
    ? Object.entries(symptoms).filter(([, v]) => v === 1).map(([k]) => k.replace(/_/g, ' '))
    : []

  const ps = PRIORITY_STYLES[token.priority] || PRIORITY_STYLES.general
  const waitedSince = token.created_at
    ? Math.floor((Date.now() - new Date(token.created_at)) / 60000)
    : 0
  const estimatedWait = token.estimated_wait || ((token.queue_position || 1) * 8)

  return (
    <div className={`rounded-2xl border-2 p-4 mb-3 ${ps.bg} ${ps.border}`}>
      {/* Collapsed row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-teal-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm flex-shrink-0">
            {token.token_number || '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-800">
              {token.patients?.name || token.patient_name || `Patient #${token.token_number}`}
              {token.patients?.age && (
                <span className="text-gray-500 text-sm font-normal ml-1">({token.patients.age}y)</span>
              )}
            </p>
            <p className="text-xs text-gray-500">
              Waited {waitedSince} min · <span className="font-medium capitalize">{token.priority}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setExpanded(p => !p)}
            className="text-xs text-teal-600 underline whitespace-nowrap"
          >
            {expanded ? 'Hide' : 'Details'}
          </button>
          <button
            onClick={() => onCall(token)}
            className="bg-teal-500 text-white text-sm px-4 py-2 rounded-xl font-medium hover:bg-teal-600 transition whitespace-nowrap"
          >
            Call
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 space-y-3 border-t border-white/50 pt-4">

          {detectedSymptoms.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Symptoms</p>
              <div className="flex flex-wrap gap-1">
                {detectedSymptoms.map(s => (
                  <span key={s} className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded-full capitalize">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {token.symptoms_summary && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Summary</p>
              <p className="text-gray-700 text-sm">{token.symptoms_summary}</p>
            </div>
          )}

          {token.ml_prediction && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">ML Prediction</p>
              <p className="text-gray-700 font-medium">{token.ml_prediction}</p>
              {token.ml_confidence && (
                <p className="text-xs text-gray-500">Confidence: {Math.round(token.ml_confidence * 100)}%</p>
              )}
            </div>
          )}

          {token.ai_summary && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">AI Analysis</p>
              <p className="text-gray-600 text-sm">{token.ai_summary}</p>
            </div>
          )}

          {token.voice_transcript && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Patient's words</p>
              <p className="text-gray-600 text-sm italic">"{token.voice_transcript}"</p>
            </div>
          )}

          <div className="flex gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Queue #</p>
              <p className="font-bold text-gray-700">#{token.queue_position || token.token_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Est. wait</p>
              <p className="font-bold text-gray-700">{estimatedWait} min</p>
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

export default function DoctorTokensPage() {
  // Get doctorId from localStorage (set during login)
  const doctorId = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      return user.supabase_doctor_id || user.doctor_id || null
    } catch { return null }
  })()

  const navigate = useNavigate()

  const {
    queue,
    doctorStatus,
    currentToken,
    channelStatus,
    loading,
    error,
    callNext,
    markDone,
    setStatus,
    refresh,
  } = useDoctorQueue(doctorId)

  const [actionLoading, setActionLoading] = useState(false)

  if (!doctorId) {
    return (
      <DoctorShell title="Patient Queue">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle size={40} className="text-yellow-500 mx-auto mb-3" />
            <p className="text-gray-600">Doctor ID not found. Please log in as a doctor.</p>
          </div>
        </div>
      </DoctorShell>
    )
  }

  const handleCallNext = async () => {
    setActionLoading(true)
    try {
      await callNext()
      toast.success('Patient called! Join the video call.')
    } catch (err) {
      toast.error(err?.message || 'No patients waiting')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkDone = async () => {
    if (!currentToken) return
    setActionLoading(true)
    try {
      // Navigate to post-consultation notes instead of marking done directly
      navigate(`/doctor/post-consultation/${currentToken.id}`, {
        state: {
          patientId: currentToken.patient_id,
          patientName: currentToken.patients?.name || null,
          doctorId,
          jitsiRoom: currentToken.jitsi_room,
          symptoms: currentToken.symptoms_summary || '',
        }
      })
    } catch (err) {
      toast.error(err?.message || 'Failed to proceed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSetStatus = async (newStatus) => {
    try {
      await setStatus(newStatus)
      toast.success(`Status set to ${newStatus}`)
    } catch (err) {
      toast.error(err?.message || 'Failed to update status')
    }
  }

  const statusCfg = STATUS_CONFIG[doctorStatus] || STATUS_CONFIG.offline

  return (
    <DoctorShell title="Patient Queue">
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

            {/* Header row */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Stethoscope size={24} className="text-blue-600" />
                Patient Queue
              </h1>
              <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full ${
                channelStatus === 'SUBSCRIBED' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
              }`}>
                {channelStatus === 'SUBSCRIBED'
                  ? <><Wifi size={14} /> Live</>
                  : <><WifiOff size={14} /> Reconnecting…</>
                }
              </div>
            </div>

            {/* Doctor status + controls */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${statusCfg.color} ring-4 ${statusCfg.ring}`} />
                  <span className="font-semibold text-gray-800">{statusCfg.label}</span>
                  <span className="text-gray-400 text-sm">·</span>
                  <span className="text-gray-500 text-sm">{queue.length} waiting</span>
                </div>

                {/* Status toggle buttons */}
                <div className="flex gap-2">
                  {['online', 'break', 'offline'].map(s => (
                    <button
                      key={s}
                      onClick={() => handleSetStatus(s)}
                      disabled={doctorStatus === s}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                        doctorStatus === s
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s === 'online' ? '🟢' : s === 'break' ? '🟡' : '⚫'} {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Current consultation */}
            <AnimatePresence>
              {doctorStatus === 'in_call' && currentToken && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-blue-600 text-white rounded-2xl p-5 shadow-lg"
                >
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-blue-200 text-sm mb-1">Currently consulting</p>
                      <p className="text-2xl font-bold">
                        Token #{currentToken.token_number}
                        {currentToken.patients?.name && ` — ${currentToken.patients.name}`}
                      </p>
                      {currentToken.symptoms_summary && (
                        <p className="text-blue-200 text-sm mt-1">
                          Symptoms: {currentToken.symptoms_summary}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {currentToken.jitsi_room && (
                        <a
                          href={`https://meet.jit.si/${currentToken.jitsi_room}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-white text-blue-700 font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors"
                        >
                          <Phone size={16} />
                          Join Call
                        </a>
                      )}
                      <button
                        onClick={handleMarkDone}
                        disabled={actionLoading}
                        className="flex items-center gap-2 bg-green-500 text-white font-semibold px-4 py-2 rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle size={16} />
                        Mark Done
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Call Next button */}
            {doctorStatus !== 'in_call' && (
              <button
                onClick={handleCallNext}
                disabled={queue.length === 0 || doctorStatus !== 'online' || actionLoading}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-colors shadow-sm"
              >
                <ChevronRight size={22} />
                {queue.length === 0 ? 'No Patients Waiting' : `Call Next Patient (${queue.length} in queue)`}
              </button>
            )}

            {/* Queue table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Users size={16} />
                  Waiting Queue
                </h2>
                <button onClick={refresh} className="text-sm text-gray-400 hover:text-gray-600">
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading queue…</div>
              ) : queue.length === 0 ? (
                <div className="p-8 text-center">
                  <Activity size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400">No patients in queue</p>
                </div>
              ) : (
                <div className="p-4 space-y-0">
                  {queue.map((token) => (
                    <PatientInfoCard
                      key={token.id}
                      token={token}
                      onCall={handleCallNext}
                    />
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                {error}
              </div>
            )}
      </div>
    </DoctorShell>
  )
}
