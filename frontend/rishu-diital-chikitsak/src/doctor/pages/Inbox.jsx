/**
 * Doctor Inbox — /doctor/inbox
 * Shows all patients who have sent messages
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, User, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import DoctorShell from '../components/DoctorShell'
import { supabase } from '../../shared/services/supabase'

export default function DoctorInbox() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCounts, setUnreadCounts] = useState({})

  const doctorId = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}').supabase_doctor_id } catch { return null }
  })()

  useEffect(() => {
    if (!doctorId) { setLoading(false); return }

    async function load() {
      // Get all messages for this doctor
      const { data: msgs } = await supabase
        .from('consultation_messages')
        .select('patient_id, created_at, message_type, content, sender_role, is_read')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false })

      if (!msgs) { setLoading(false); return }

      // Group by patient
      const patientMap = {}
      const unread = {}
      msgs.forEach(m => {
        if (!patientMap[m.patient_id]) patientMap[m.patient_id] = m
        if (!m.is_read && m.sender_role === 'patient') {
          unread[m.patient_id] = (unread[m.patient_id] || 0) + 1
        }
      })
      setUnreadCounts(unread)

      const patientIds = Object.keys(patientMap)
      if (patientIds.length > 0) {
        const { data: patients } = await supabase
          .from('patients').select('id, name, age, phone').in('id', patientIds)
        if (patients) {
          setConversations(patients.map(p => ({
            ...p,
            lastMessage: patientMap[p.id],
          })).sort((a, b) =>
            new Date(b.lastMessage?.created_at) - new Date(a.lastMessage?.created_at)
          ))
        }
      }
      setLoading(false)
    }
    load()

    // Realtime: new messages
    const channel = supabase
      .channel(`inbox:${doctorId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'consultation_messages',
        filter: `doctor_id=eq.${doctorId}`,
      }, () => load())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [doctorId])

  const getPreview = (msg) => {
    if (!msg) return ''
    if (msg.message_type === 'text') return msg.content.slice(0, 60)
    if (msg.message_type === 'audio') return '🎤 Voice note'
    if (msg.message_type === 'video') return '📹 Video message'
    if (msg.message_type === 'image') return '🖼️ Image'
    return '📎 Attachment'
  }

  return (
    <DoctorShell title="Patient Messages">
      <div className="max-w-lg mx-auto px-4 py-5">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No patient messages yet</p>
            <p className="text-gray-300 text-xs mt-1">Patients will appear here when they message you</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(conv => {
              const unread = unreadCounts[conv.id] || 0
              return (
                <motion.button
                  key={conv.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(`/doctor/chat/${conv.id}`)}
                  className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {conv.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{conv.name}</p>
                    <p className="text-xs text-gray-400">
                      {conv.age ? `${conv.age}y · ` : ''}{conv.phone}
                    </p>
                    <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                      {getPreview(conv.lastMessage)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {unread > 0 && (
                      <span className="w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unread}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-300">
                      {conv.lastMessage ? new Date(conv.lastMessage.created_at).toLocaleDateString() : ''}
                    </span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </DoctorShell>
  )
}
