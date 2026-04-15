import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Stethoscope, Pill, FileText, Users, BookOpen,
  Bell, ChevronRight, Heart, Activity, AlertTriangle,
  Clock, TrendingUp, Calendar, MessageCircle
} from 'lucide-react'
import AppShell from '../components/AppShell'
import { getCurrentUser } from '../../shared/services/auth'
import EmergencyHelp from '../../shared/components/EmergencyHelp'
import VoiceOnboarding from './VoiceOnboarding'

const QUICK_ACTIONS = [
  {
    label: 'Check Symptoms',
    sublabel: 'AI-powered triage',
    icon: Stethoscope,
    path: '/patient/symptom-checker',
    color: 'bg-teal-500',
    light: 'bg-teal-50 text-teal-700',
  },
  {
    label: 'My Tokens',
    sublabel: 'Queue status',
    icon: Clock,
    path: '/patient/tokens',
    color: 'bg-blue-500',
    light: 'bg-blue-50 text-blue-700',
  },
  {
    label: 'Pharmacy',
    sublabel: 'Find medicines',
    icon: Pill,
    path: '/patient/pharmacy',
    color: 'bg-green-500',
    light: 'bg-green-50 text-green-700',
  },
  {
    label: 'Messages',
    sublabel: 'Chat with doctor',
    icon: MessageCircle,
    path: '/patient/chats',
    color: 'bg-indigo-500',
    light: 'bg-indigo-50 text-indigo-700',
  },
  {
    label: 'Reminders',
    sublabel: 'Medication schedule',
    icon: Bell,
    path: '/patient/reminders',
    color: 'bg-purple-500',
    light: 'bg-purple-50 text-purple-700',
  },
]

const FEATURES = [
  {
    label: 'Health Records',
    desc: 'Upload & manage documents',
    icon: FileText,
    path: '/patient/records',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    label: 'Family Members',
    desc: 'Manage family health',
    icon: Users,
    path: '/patient/family',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    label: 'Health Education',
    desc: 'Articles & videos',
    icon: BookOpen,
    path: '/patient/education',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
  },
  {
    label: 'Book Doctor',
    desc: 'Schedule appointment',
    icon: Calendar,
    path: '/patient/book-doctor',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
]

const HEALTH_TIPS = [
  'Drink 8 glasses of water daily to stay hydrated.',
  'Walk 30 minutes a day to improve heart health.',
  'Sleep 7–8 hours for better immunity.',
  'Eat seasonal fruits and vegetables daily.',
]

export default function PatientDashboard() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [showEmergency, setShowEmergency] = useState(false)
  const [showVoiceOnboarding, setShowVoiceOnboarding] = useState(true)
  const [tip] = useState(() => HEALTH_TIPS[Math.floor(Math.random() * HEALTH_TIPS.length)])

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (showEmergency) return <EmergencyHelp />

  // Show voice onboarding first — patient taps mic or skips
  if (showVoiceOnboarding) {
    return <VoiceOnboarding onDismiss={() => setShowVoiceOnboarding(false)} />
  }

  return (
    <AppShell title="Home">
      <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 py-5 space-y-6">

        {/* ── Welcome banner ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-5 text-white relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute right-8 bottom-0 w-20 h-20 bg-white/10 rounded-full translate-y-6" />
          <p className="text-teal-100 text-sm">{getGreeting()}</p>
          <h2 className="text-2xl font-bold mt-0.5">{user?.name || 'Patient'} 👋</h2>
          <p className="text-teal-100 text-sm mt-1">How are you feeling today?</p>
          <button
            onClick={() => navigate('/patient/symptom-checker')}
            className="mt-4 bg-white text-teal-600 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-teal-50 transition-colors inline-flex items-center gap-2"
          >
            <Stethoscope size={16} />
            Start Consultation
          </button>
        </motion.div>

        {/* ── Emergency strip ─────────────────────────────── */}
        <button
          onClick={() => setShowEmergency(true)}
          className="w-full flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5 hover:bg-red-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500 rounded-xl flex items-center justify-center">
              <AlertTriangle size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-red-700 text-sm">Emergency Help</p>
              <p className="text-red-500 text-xs">Ambulance · Hospitals · Quick dial</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-red-400" />
        </button>

        {/* ── Quick actions ───────────────────────────────── */}
        <div>
          <h3 className="font-semibold text-gray-700 text-sm mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(({ label, sublabel, icon: Icon, path, color, light }) => (
              <motion.button
                key={path}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(path)}
                className="bg-white rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition-all border border-gray-100"
              >
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                  <Icon size={20} className="text-white" />
                </div>
                <p className="font-semibold text-gray-800 text-sm leading-tight">{label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{sublabel}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── Health tip ──────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
            <Heart size={16} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Daily Health Tip</p>
            <p className="text-gray-700 text-sm">{tip}</p>
          </div>
        </div>

        {/* ── More features ───────────────────────────────── */}
        <div>
          <h3 className="font-semibold text-gray-700 text-sm mb-3">More Services</h3>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ label, desc, icon: Icon, path, color, bg }) => (
              <motion.button
                key={path}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(path)}
                className="bg-white rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition-all border border-gray-100 flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className={color} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{label}</p>
                  <p className="text-gray-400 text-xs truncate">{desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  )
}
