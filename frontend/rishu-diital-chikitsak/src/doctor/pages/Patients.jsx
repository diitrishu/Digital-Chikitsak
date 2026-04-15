/**
 * Doctor Patients — view all patients who consulted this doctor
 * Shows: patient info, symptoms, ML prediction, consultation notes
 * Cloudinary: patient health record images
 */
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, User, FileText, X, ChevronRight, Stethoscope, Clock, Activity } from 'lucide-react'
import toast from 'react-hot-toast'
import DoctorShell from '../components/DoctorShell'
import { supabase } from '../../shared/services/supabase'

const PRIORITY_COLORS = {
  emergency: 'bg-red-100 text-red-700 border-red-200',
  senior:    'bg-orange-100 text-orange-700 border-orange-200',
  child:     'bg-blue-100 text-blue-700 border-blue-200',
  general:   'bg-green-100 text-green-700 border-green-200',
}

export default function DoctorPatients() {
  const [tokens, setTokens] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [patientSymptoms, setPatientSymptoms] = useState([])
  const [notes, setNotes] = useState({ diagnosis: '', prescription: '', notes: '' })
  const [savingNotes, setSavingNotes] = useState(false)
  const [loading, setLoading] = useState(true)

  const doctorId = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}').supabase_doctor_id } catch { return null }
  })()

  useEffect(() => {
    if (!doctorId) { setLoading(false); return }
    supabase
      .from('tokens')
      .select('*, patients(id, name, age, phone)')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTokens(data || [])
        setLoading(false)
      })
  }, [doctorId])

  const openPatient = async (token) => {
    setSelected(token)
    setNotes({ diagnosis: '', prescription: '', notes: '' })

    // Load symptoms for this patient
    if (token.patients?.id) {
      const { data } = await supabase
        .from('symptoms')
        .select('*')
        .eq('patient_id', token.patients.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setPatientSymptoms(data || [])
    }

    // Load existing notes
    const { data: existingNotes } = await supabase
      .from('consultation_notes')
      .select('*')
      .eq('token_id', token.id)
      .maybeSingle()
    if (existingNotes) {
      setNotes({
        diagnosis: existingNotes.diagnosis || '',
        prescription: existingNotes.prescription || '',
        notes: existingNotes.notes || '',
      })
    }
  }

  const saveNotes = async () => {
    if (!selected || !doctorId) return
    setSavingNotes(true)
    try {
      await supabase.from('consultation_notes').upsert({
        token_id:    selected.id,
        doctor_id:   doctorId,
        patient_id:  selected.patients?.id,
        symptoms:    selected.symptoms_summary,
        diagnosis:   notes.diagnosis,
        prescription: notes.prescription,
        notes:       notes.notes,
        updated_at:  new Date().toISOString(),
      }, { onConflict: 'token_id' })
      toast.success('Notes saved!')
    } catch (err) {
      toast.error('Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  const filtered = tokens.filter(t =>
    !search || t.patients?.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.symptoms_summary?.toLowerCase().includes(search.toLowerCase())
  )

  // Group by unique patient
  const uniquePatients = filtered.reduce((acc, token) => {
    const pid = token.patients?.id
    if (pid && !acc.find(t => t.patients?.id === pid)) acc.push(token)
    return acc
  }, [])

  return (
    <DoctorShell title="Patients">
      <div className="max-w-4xl mx-auto px-4 py-5">

        {/* Search */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patients by name or symptoms…"
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : uniquePatients.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <User size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No patients yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {uniquePatients.map(token => {
              const pc = PRIORITY_COLORS[token.priority] || PRIORITY_COLORS.general
              const allTokens = tokens.filter(t => t.patients?.id === token.patients?.id)
              return (
                <motion.button
                  key={token.patients?.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => openPatient(token)}
                  className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {token.patients?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{token.patients?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {token.patients?.age ? `${token.patients.age}y · ` : ''}
                      {token.symptoms_summary || 'No symptoms recorded'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">{allTokens.length} visit{allTokens.length !== 1 ? 's' : ''}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${pc}`}>{token.priority}</span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* Patient detail drawer */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                    {selected.patients?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{selected.patients?.name}</p>
                    <p className="text-xs text-gray-400">
                      {selected.patients?.age ? `${selected.patients.age} years · ` : ''}
                      {selected.patients?.phone}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Symptoms summary */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Activity size={12} />
                    Reported Symptoms
                  </p>
                  <p className="text-sm text-gray-700">{selected.symptoms_summary || 'Not recorded'}</p>
                </div>

                {/* ML prediction */}
                {patientSymptoms.length > 0 && patientSymptoms[0].ml_prediction && (() => {
                  try {
                    const ml = JSON.parse(patientSymptoms[0].ml_prediction)
                    return (
                      <div className="bg-blue-50 rounded-2xl p-4">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">AI Prediction</p>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-gray-800">{ml.disease}</p>
                          <span className="text-sm font-semibold text-blue-600">{ml.confidence}%</span>
                        </div>
                        <div className="w-full bg-blue-100 rounded-full h-1.5 mb-3">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${ml.confidence}%` }} />
                        </div>
                        {ml.remedy && <p className="text-xs text-gray-600">{ml.remedy}</p>}
                      </div>
                    )
                  } catch { return null }
                })()}

                {/* Consultation notes */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText size={12} />
                    Consultation Notes
                  </p>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Diagnosis</label>
                    <input
                      value={notes.diagnosis}
                      onChange={e => setNotes(n => ({ ...n, diagnosis: e.target.value }))}
                      placeholder="e.g. Acute upper respiratory infection"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Prescription</label>
                    <textarea
                      value={notes.prescription}
                      onChange={e => setNotes(n => ({ ...n, prescription: e.target.value }))}
                      placeholder="Medicines, dosage, duration…"
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Additional Notes</label>
                    <textarea
                      value={notes.notes}
                      onChange={e => setNotes(n => ({ ...n, notes: e.target.value }))}
                      placeholder="Follow-up instructions, lifestyle advice…"
                      rows={2}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    />
                  </div>

                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                  >
                    {savingNotes ? 'Saving…' : 'Save Notes'}
                  </button>
                </div>

                {/* Visit history */}
                {tokens.filter(t => t.patients?.id === selected.patients?.id).length > 1 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Clock size={12} />
                      Visit History
                    </p>
                    <div className="space-y-2">
                      {tokens.filter(t => t.patients?.id === selected.patients?.id).map(t => (
                        <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 text-sm">
                          <span className="text-gray-600">{new Date(t.created_at).toLocaleDateString()}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            t.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>{t.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DoctorShell>
  )
}
