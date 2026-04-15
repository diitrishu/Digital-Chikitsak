/**
 * Doctor Onboarding — shown on first login
 * Collects: specialization, qualification, experience, hospital, bio, languages, photo
 * Saves to Supabase doctors table + Cloudinary for photo
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Stethoscope, GraduationCap, Building2, Clock,
  Globe, Camera, ChevronRight, ChevronLeft, Check, Loader
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../shared/services/supabase'
import { getCurrentUser } from '../../shared/services/auth'
import { uploadProfileImage } from '../../shared/services/cloudinary'

const SPECIALIZATIONS = [
  { value: 'general',          label: 'General Physician',    emoji: '🏥', desc: 'Fever, fatigue, headache, general illness' },
  { value: 'respiratory',      label: 'Respiratory',          emoji: '🫁', desc: 'Cough, breathlessness, asthma, COPD' },
  { value: 'gastroenterology', label: 'Gastroenterology',     emoji: '🫃', desc: 'Stomach pain, nausea, diarrhea, IBS' },
  { value: 'orthopedics',      label: 'Orthopedics',          emoji: '🦴', desc: 'Joint pain, back pain, fractures' },
  { value: 'dermatology',      label: 'Dermatology',          emoji: '🧴', desc: 'Rash, itching, skin conditions' },
  { value: 'cardiology',       label: 'Cardiology',           emoji: '❤️', desc: 'Chest pain, heart conditions, BP' },
  { value: 'pediatrics',       label: 'Pediatrics',           emoji: '👶', desc: 'Children under 12 years' },
  { value: 'geriatrics',       label: 'Geriatrics',           emoji: '👴', desc: 'Senior patients above 60 years' },
]

const LANGUAGES = ['English', 'Hindi', 'Punjabi', 'Urdu', 'Bengali', 'Tamil', 'Telugu', 'Marathi']

const STEPS = [
  { id: 'specialization', title: 'Your Specialization', subtitle: 'What do you specialize in?' },
  { id: 'credentials',    title: 'Credentials',         subtitle: 'Your qualifications and experience' },
  { id: 'profile',        title: 'Your Profile',        subtitle: 'Help patients know you better' },
  { id: 'done',           title: 'All Set!',             subtitle: 'Your profile is ready' },
]

export default function DoctorOnboarding() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)

  const [form, setForm] = useState({
    specialization: '',
    qualification: '',
    experience: '',
    hospital: '',
    avg_consult_time: 10,
    bio: '',
    languages: ['English'],
    phone: user?.phone || '',
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const toggleLanguage = (lang) => {
    setForm(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }))
  }

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!form.specialization) { toast.error('Please select your specialization'); return }
    if (!form.qualification)  { toast.error('Please enter your qualification'); return }

    setSaving(true)
    try {
      // Find doctor row by phone
      const { data: doctorRow } = await supabase
        .from('doctors')
        .select('id')
        .eq('phone', user.phone)
        .maybeSingle()

      let profileImageUrl = null

      // Upload photo to Cloudinary if provided
      if (photoFile && doctorRow?.id) {
        try {
          const result = await uploadProfileImage(photoFile, doctorRow.id)
          profileImageUrl = result.secure_url
        } catch (e) {
          console.warn('Photo upload failed:', e)
        }
      }

      const updates = {
        specialization:  form.specialization,
        qualification:   form.qualification,
        experience:      parseInt(form.experience) || 0,
        hospital:        form.hospital,
        avg_consult_time: parseInt(form.avg_consult_time) || 10,
        bio:             form.bio,
        languages:       form.languages,
        phone:           form.phone,
        is_onboarded:    true,
        status:          'online',
        ...(profileImageUrl && { profile_image: profileImageUrl }),
      }

      if (doctorRow?.id) {
        // Update existing row
        await supabase.from('doctors').update(updates).eq('id', doctorRow.id)
        // Store doctor ID in localStorage for queue operations
        const stored = JSON.parse(localStorage.getItem('user') || '{}')
        stored.supabase_doctor_id = doctorRow.id
        localStorage.setItem('user', JSON.stringify(stored))
      } else {
        // Create new doctor row
        const { data: newDoc } = await supabase
          .from('doctors')
          .insert({ name: user.name || user.phone, ...updates })
          .select('id')
          .single()
        if (newDoc?.id) {
          const stored = JSON.parse(localStorage.getItem('user') || '{}')
          stored.supabase_doctor_id = newDoc.id
          localStorage.setItem('user', JSON.stringify(stored))
        }
      }

      setStep(3) // done
    } catch (err) {
      console.error(err)
      toast.error('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const currentStep = STEPS[step]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Stethoscope size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Doctor Portal Setup</h1>
          <p className="text-gray-500 text-sm mt-1">Complete your profile to start seeing patients</p>
        </div>

        {/* Step indicator */}
        {step < 3 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.slice(0, 3).map((s, i) => (
              <React.Fragment key={s.id}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? 'bg-blue-600 text-white' :
                  i === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                {i < 2 && <div className={`w-12 h-0.5 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-blue-600 px-6 py-4">
            <h2 className="text-white font-bold text-lg">{currentStep.title}</h2>
            <p className="text-blue-200 text-sm">{currentStep.subtitle}</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >

              {/* ── STEP 0: Specialization ─────────────────── */}
              {step === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-4">Select the area you primarily practice in. This determines which patients are routed to you.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SPECIALIZATIONS.map(spec => (
                      <button
                        key={spec.value}
                        onClick={() => set('specialization', spec.value)}
                        className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                          form.specialization === spec.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-2xl">{spec.emoji}</span>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{spec.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{spec.desc}</p>
                        </div>
                        {form.specialization === spec.value && (
                          <Check size={16} className="text-blue-600 ml-auto flex-shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── STEP 1: Credentials ────────────────────── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <GraduationCap size={14} className="inline mr-1.5" />
                      Qualification *
                    </label>
                    <input
                      value={form.qualification}
                      onChange={e => set('qualification', e.target.value)}
                      placeholder="e.g. MBBS, MD, MS, DNB"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        <Clock size={14} className="inline mr-1.5" />
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={form.experience}
                        onChange={e => set('experience', e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        <Clock size={14} className="inline mr-1.5" />
                        Avg. Consult Time (min)
                      </label>
                      <select
                        value={form.avg_consult_time}
                        onChange={e => set('avg_consult_time', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {[5, 8, 10, 12, 15, 20, 30].map(t => (
                          <option key={t} value={t}>{t} minutes</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Building2 size={14} className="inline mr-1.5" />
                      Hospital / Clinic
                    </label>
                    <input
                      value={form.hospital}
                      onChange={e => set('hospital', e.target.value)}
                      placeholder="e.g. Civil Hospital Patiala"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Globe size={14} className="inline mr-1.5" />
                      Languages Spoken
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map(lang => (
                        <button
                          key={lang}
                          onClick={() => toggleLanguage(lang)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                            form.languages.includes(lang)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Profile ────────────────────────── */}
              {step === 2 && (
                <div className="space-y-5">
                  {/* Photo upload */}
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
                        {photoPreview
                          ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          : <Camera size={28} className="text-gray-300" />
                        }
                      </div>
                      <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700">
                        <Camera size={13} className="text-white" />
                        <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                      </label>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{user?.name}</p>
                      <p className="text-sm text-gray-400">{form.specialization ? SPECIALIZATIONS.find(s => s.value === form.specialization)?.label : 'Doctor'}</p>
                      <p className="text-xs text-gray-400 mt-1">Upload a professional photo (optional)</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">About You</label>
                    <textarea
                      value={form.bio}
                      onChange={e => set('bio', e.target.value)}
                      placeholder="Brief introduction for patients — your approach, expertise, what you treat..."
                      rows={4}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">{form.bio.length}/300 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                    <input
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 3: Done ───────────────────────────── */}
              {step === 3 && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Check size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Profile Complete!</h3>
                  <p className="text-gray-500 text-sm">
                    You're now set up as a <strong>{SPECIALIZATIONS.find(s => s.value === form.specialization)?.label}</strong>.
                    Patients with matching symptoms will be routed to you automatically.
                  </p>
                  <div className="bg-blue-50 rounded-2xl p-4 text-left space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Specialization</span><span className="font-medium">{SPECIALIZATIONS.find(s => s.value === form.specialization)?.label}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Qualification</span><span className="font-medium">{form.qualification}</span></div>
                    {form.experience && <div className="flex justify-between"><span className="text-gray-500">Experience</span><span className="font-medium">{form.experience} years</span></div>}
                    {form.hospital && <div className="flex justify-between"><span className="text-gray-500">Hospital</span><span className="font-medium">{form.hospital}</span></div>}
                    <div className="flex justify-between"><span className="text-gray-500">Consult Time</span><span className="font-medium">{form.avg_consult_time} min/patient</span></div>
                  </div>
                  <button
                    onClick={() => navigate('/doctor')}
                    className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Go to Dashboard →
                  </button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          {step < 3 && (
            <div className="px-6 pb-6 flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-2 px-5 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              )}
              {step < 2 ? (
                <button
                  onClick={() => {
                    if (step === 0 && !form.specialization) { toast.error('Please select your specialization'); return }
                    setStep(s => s + 1)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Continue
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? <><Loader size={16} className="animate-spin" /> Saving…</> : <><Check size={16} /> Complete Setup</>}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
