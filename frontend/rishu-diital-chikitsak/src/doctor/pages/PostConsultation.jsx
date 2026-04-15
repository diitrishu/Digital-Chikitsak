/**
 * PostConsultation — /doctor/post-consultation/:tokenId
 * Doctor fills notes after Jitsi call ends.
 * Saves to MySQL via Flask, marks token done in Supabase.
 */
import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import axios from 'axios'
import { supabase } from '../../shared/services/supabase'

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
    severity: 'mild',
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
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')

      // Save consultation notes to MySQL via Flask
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
          jitsi_room: tokenData.jitsiRoom || null,
          symptoms: tokenData.symptoms || '',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Mark token as done in Supabase
      await supabase
        .from('tokens')
        .update({ status: 'done' })
        .eq('id', tokenId)

      // Set doctor back to online
      if (tokenData.doctorId) {
        await supabase
          .from('doctors')
          .update({ status: 'online', current_patient_id: null })
          .eq('id', tokenData.doctorId)
      }

      setSubmitted(true)
      setTimeout(() => navigate('/doctor/queue'), 2000)
    } catch (err) {
      console.error('Save consultation error:', err)
      alert('Error saving notes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSkip() {
    // Still mark token done even if notes skipped
    try {
      await supabase.from('tokens').update({ status: 'done' }).eq('id', tokenId)
      if (tokenData.doctorId) {
        await supabase
          .from('doctors')
          .update({ status: 'online', current_patient_id: null })
          .eq('id', tokenData.doctorId)
      }
    } catch { /* non-fatal */ }
    navigate('/doctor/queue')
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
          <p className="text-gray-500">
            Patient: <span className="font-medium text-gray-700">{tokenData.patientName}</span>
          </p>
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
                    ${form.severity === s
                      ? 'bg-teal-500 text-white border-teal-500'
                      : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}
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
          onClick={handleSkip}
          className="w-full border border-gray-300 text-gray-600 py-3 rounded-2xl font-medium hover:bg-gray-50 transition"
        >
          Skip Notes (Go Back to Queue)
        </button>

      </div>
    </div>
  )
}
