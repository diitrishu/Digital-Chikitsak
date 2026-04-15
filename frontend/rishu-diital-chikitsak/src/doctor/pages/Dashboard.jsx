/**
 * Doctor Dashboard — main hub after login
 * Shows: stats, today's queue summary, quick actions, recent patients
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Clock, CheckCircle, Video, ChevronRight, Stethoscope, TrendingUp, AlertCircle } from 'lucide-react'
import DoctorShell from '../components/DoctorShell'
import { supabase } from '../../shared/services/supabase'
import { getCurrentUser } from '../../shared/services/auth'

const SPEC_LABELS = {
  general: 'General Physician', respiratory: 'Respiratory', gastroenterology: 'Gastroenterology',
  orthopedics: 'Orthopedics', dermatology: 'Dermatology', cardiology: 'Cardiology',
  pediatrics: 'Pediatrics', geriatrics: 'Geriatrics',
}

const PRIORITY_COLORS = {
  emergency: 'bg-red-100 text-red-700',
  senior:    'bg-orange-100 text-orange-700',
  child:     'bg-blue-100 text-blue-700',
  general:   'bg-green-100 text-green-700',
}

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [doctorInfo, setDoctorInfo] = useState(null)
  const [stats, setStats] = useState({ waiting: 0, done: 0, inCall: 0 })
  const [recentTokens, setRecentTokens] = useState([])
  const [loading, setLoading] = useState(true)

  const doctorId = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}').supabase_doctor_id } catch { return null }
  })()

  useEffect(() => {
    if (!doctorId) { setLoading(false); return }
    async function load() {
      const [{ data: doc }, { data: tokens }] = await Promise.all([
        supabase.from('doctors').select('*').eq('id', doctorId).single(),
        supabase.from('tokens').select('*, patients(name, age)').eq('doctor_id', doctorId)
          .order('created_at', { ascending: false }).limit(20),
      ])
      if (doc) {
        setDoctorInfo(doc)
        // Redirect to onboarding if not set up
        if (!doc.is_onboarded) { navigate('/doctor/onboarding'); return }
      }
      if (tokens) {
        setStats({
          waiting: tokens.filter(t => t.status === 'waiting').length,
          done:    tokens.filter(t => t.status === 'done').length,
          inCall:  tokens.filter(t => t.status === 'in_consultation').length,
        })
        setRecentTokens(tokens.slice(0, 5))
      }
      setLoading(false)
    }
    load()
  }, [doctorId, navigate])

  // No doctor ID — redirect to onboarding
  useEffect(() => {
    if (!loading && !doctorId) navigate('/doctor/onboarding')
  }, [loading, doctorId, navigate])

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <DoctorShell title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </DoctorShell>
    )
  }

  return (
    <DoctorShell title="Dashboard">
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-6">

        {/* Welcome banner */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <p className="text-blue-200 text-sm">{getGreeting()}</p>
          <h2 className="text-2xl font-bold mt-0.5">Dr. {user?.name || 'Doctor'} 👨‍⚕️</h2>
          {doctorInfo && (
            <p className="text-blue-200 text-sm mt-1">
              {SPEC_LABELS[doctorInfo.specialization] || doctorInfo.specialization}
              {doctorInfo.hospital && ` · ${doctorInfo.hospital}`}
            </p>
          )}
          <button
            onClick={() => navigate('/doctor/queue')}
            className="mt-4 bg-white text-blue-600 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
          >
            <Users size={16} />
            View Patient Queue
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Waiting',     value: stats.waiting, icon: Clock,        color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'In Call',     value: stats.inCall,  icon: Video,        color: 'text-blue-600',   bg: 'bg-blue-50' },
            { label: 'Done Today',  value: stats.done,    icon: CheckCircle,  color: 'text-green-600',  bg: 'bg-green-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <Icon size={20} className={color} />
              </div>
              <p className="text-2xl font-black text-gray-800">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/doctor/queue')}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Patient Queue</p>
              <p className="text-xs text-gray-400 mt-0.5">{stats.waiting} waiting now</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 ml-auto" />
          </button>

          <button
            onClick={() => navigate('/doctor/patients')}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Stethoscope size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Patient Records</p>
              <p className="text-xs text-gray-400 mt-0.5">View history & notes</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 ml-auto" />
          </button>
        </div>

        {/* Recent tokens */}
        {recentTokens.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-700 text-sm">Recent Patients</h3>
              <button onClick={() => navigate('/doctor/patients')} className="text-xs text-blue-600 hover:underline">View all</button>
            </div>
            {recentTokens.map(token => (
              <div key={token.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                    {token.patients?.name?.charAt(0)?.toUpperCase() || '#'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{token.patients?.name || 'Patient'}</p>
                    <p className="text-xs text-gray-400">{token.symptoms_summary || 'No symptoms noted'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[token.priority] || PRIORITY_COLORS.general}`}>
                    {token.priority}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    token.status === 'done' ? 'bg-green-100 text-green-700' :
                    token.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {token.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Profile reminder if incomplete */}
        {doctorInfo && !doctorInfo.bio && (
          <button
            onClick={() => navigate('/doctor/profile')}
            className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 hover:bg-amber-100 transition-colors"
          >
            <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold text-amber-800">Complete your profile</p>
              <p className="text-xs text-amber-600">Add a bio and photo to build patient trust</p>
            </div>
            <ChevronRight size={16} className="text-amber-400 ml-auto" />
          </button>
        )}

      </div>
    </DoctorShell>
  )
}
