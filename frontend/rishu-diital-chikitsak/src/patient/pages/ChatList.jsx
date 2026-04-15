/**
 * Patient Chat List — /patient/chats
 * Shows all doctors the patient has chatted with or can chat with
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Stethoscope, ChevronRight, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import AppShell from '../components/AppShell'
import { supabase } from '../../shared/services/supabase'

const SPEC_LABELS = {
  general: 'General Physician', respiratory: 'Respiratory', gastroenterology: 'Gastroenterology',
  orthopedics: 'Orthopedics', dermatology: 'Dermatology', cardiology: 'Cardiology',
  pediatrics: 'Pediatrics', geriatrics: 'Geriatrics',
}

export default function PatientChatList() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [allDoctors, setAllDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('chats') // 'chats' | 'doctors'

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()

  useEffect(() => {
    async function load() {
      // Get patient
      const { data: patient } = await supabase
        .from('patients').select('id').eq('phone', user.phone).maybeSingle()
      if (!patient) { setLoading(false); return }

      // Get unique doctors this patient has messaged
      const { data: msgs } = await supabase
        .from('consultation_messages')
        .select('doctor_id, created_at, message_type, content, sender_role')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })

      if (msgs) {
        // Group by doctor, get last message
        const doctorMap = {}
        msgs.forEach(m => {
          if (!doctorMap[m.doctor_id]) doctorMap[m.doctor_id] = m
        })

        // Fetch doctor details
        const doctorIds = Object.keys(doctorMap)
        if (doctorIds.length > 0) {
          const { data: doctors } = await supabase
            .from('doctors').select('id, name, specialization, status').in('id', doctorIds)
          if (doctors) {
            setConversations(doctors.map(d => ({
              ...d,
              lastMessage: doctorMap[d.id],
            })))
          }
        }
      }

      // Get all online doctors for new chat
      const { data: docs } = await supabase
        .from('doctors').select('id, name, specialization, status').eq('status', 'online')
      setAllDoctors(docs || [])
      setLoading(false)
    }
    load()
  }, [user.phone])

  const getLastMsgPreview = (msg) => {
    if (!msg) return 'Start a conversation'
    if (msg.message_type === 'text') return msg.content.slice(0, 50)
    if (msg.message_type === 'audio') return '🎤 Voice note'
    if (msg.message_type === 'video') return '📹 Video message'
    if (msg.message_type === 'image') return '🖼️ Image'
    return '📎 Attachment'
  }

  return (
    <AppShell title="Messages">
      <div className="max-w-lg mx-auto px-4 py-5">
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
          <button
            onClick={() => setTab('chats')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'chats' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
          >
            My Chats
          </button>
          <button
            onClick={() => setTab('doctors')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'doctors' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
          >
            Find Doctor
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
          </div>
        ) : tab === 'chats' ? (
          conversations.length === 0 ? (
            <div className="text-center py-16">
              <MessageCircle size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No conversations yet</p>
              <button
                onClick={() => setTab('doctors')}
                className="mt-4 bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-teal-600"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map(conv => (
                <motion.button
                  key={conv.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(`/patient/chat/${conv.id}`)}
                  className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Stethoscope size={22} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{conv.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{SPEC_LABELS[conv.specialization] || conv.specialization}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{getLastMsgPreview(conv.lastMessage)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className={`w-2 h-2 rounded-full ${conv.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </motion.button>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-3">Online doctors — tap to start a conversation</p>
            {allDoctors.map(doc => (
              <motion.button
                key={doc.id}
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(`/patient/chat/${doc.id}`)}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all text-left"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Stethoscope size={22} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{doc.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{SPEC_LABELS[doc.specialization] || doc.specialization}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Online</span>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
