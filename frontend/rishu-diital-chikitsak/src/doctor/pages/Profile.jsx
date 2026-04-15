/**
 * Doctor Profile — view and edit profile
 */
import React, { useState, useEffect } from 'react'
import { Camera, Save, Loader } from 'lucide-react'
import DoctorShell from '../components/DoctorShell'
import { supabase } from '../../shared/services/supabase'
import { uploadProfileImage } from '../../shared/services/cloudinary'
import toast from 'react-hot-toast'

const SPECIALIZATIONS = [
  { value: 'general', label: 'General Physician' },
  { value: 'respiratory', label: 'Respiratory' },
  { value: 'gastroenterology', label: 'Gastroenterology' },
  { value: 'orthopedics', label: 'Orthopedics' },
  { value: 'dermatology', label: 'Dermatology' },
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'pediatrics', label: 'Pediatrics' },
  { value: 'geriatrics', label: 'Geriatrics' },
]

const LANGUAGES = ['English', 'Hindi', 'Punjabi', 'Urdu', 'Bengali', 'Tamil', 'Telugu', 'Marathi']

export default function DoctorProfile() {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const doctorId = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}').supabase_doctor_id } catch { return null }
  })()

  useEffect(() => {
    if (!doctorId) return
    supabase.from('doctors').select('*').eq('id', doctorId).single()
      .then(({ data }) => {
        if (data) {
          setForm(data)
          if (data.profile_image) setPhotoPreview(data.profile_image)
        }
      })
  }, [doctorId])

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const toggleLanguage = (lang) => {
    const langs = form.languages || []
    set('languages', langs.includes(lang) ? langs.filter(l => l !== lang) : [...langs, lang])
  }

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!doctorId || !form) return
    setSaving(true)
    try {
      let profileImageUrl = form.profile_image
      if (photoFile) {
        const result = await uploadProfileImage(photoFile, doctorId)
        profileImageUrl = result.secure_url
      }
      await supabase.from('doctors').update({
        specialization:   form.specialization,
        qualification:    form.qualification,
        experience:       parseInt(form.experience) || 0,
        hospital:         form.hospital,
        avg_consult_time: parseInt(form.avg_consult_time) || 10,
        bio:              form.bio,
        languages:        form.languages,
        phone:            form.phone,
        profile_image:    profileImageUrl,
      }).eq('id', doctorId)
      toast.success('Profile updated!')
    } catch (err) {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!form) return (
    <DoctorShell title="Profile">
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    </DoctorShell>
  )

  return (
    <DoctorShell title="Profile">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* Photo + name */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
              {photoPreview
                ? <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                : <span className="text-3xl font-bold text-gray-300">{form.name?.charAt(0)}</span>
              }
            </div>
            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700">
              <Camera size={13} className="text-white" />
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>
          </div>
          <div>
            <p className="font-bold text-gray-800 text-lg">{form.name}</p>
            <p className="text-sm text-gray-400">{SPECIALIZATIONS.find(s => s.value === form.specialization)?.label || 'Doctor'}</p>
            {form.hospital && <p className="text-xs text-gray-400 mt-0.5">{form.hospital}</p>}
          </div>
        </div>

        {/* Form fields */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-700 text-sm">Professional Details</h3>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Specialization</label>
            <select
              value={form.specialization || ''}
              onChange={e => set('specialization', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {SPECIALIZATIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Qualification</label>
              <input value={form.qualification || ''} onChange={e => set('qualification', e.target.value)}
                placeholder="MBBS, MD…" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Experience (years)</label>
              <input type="number" value={form.experience || ''} onChange={e => set('experience', e.target.value)}
                placeholder="10" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Hospital / Clinic</label>
              <input value={form.hospital || ''} onChange={e => set('hospital', e.target.value)}
                placeholder="Civil Hospital…" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Avg. Consult Time</label>
              <select value={form.avg_consult_time || 10} onChange={e => set('avg_consult_time', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {[5, 8, 10, 12, 15, 20, 30].map(t => <option key={t} value={t}>{t} min</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Bio</label>
            <textarea value={form.bio || ''} onChange={e => set('bio', e.target.value)}
              rows={3} placeholder="Brief introduction for patients…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Languages</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <button key={lang} onClick={() => toggleLanguage(lang)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    (form.languages || []).includes(lang)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}>
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
          {saving ? <><Loader size={16} className="animate-spin" /> Saving…</> : <><Save size={16} /> Save Profile</>}
        </button>
      </div>
    </DoctorShell>
  )
}
