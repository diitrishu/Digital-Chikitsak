/**
 * useConsultationChat — Realtime chat hook for both patient and doctor
 *
 * Subscribes to consultation_messages for a given token_id.
 * Handles text, audio, video, image messages.
 * Media is stored in Cloudinary; only the URL is stored in Supabase.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../services/supabase'

export function useConsultationChat(tokenId, patientId, doctorId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [channelStatus, setChannelStatus] = useState('CONNECTING')
  const channelRef = useRef(null)

  // Load existing messages
  const loadMessages = useCallback(async () => {
    if (!tokenId) return
    const { data, error } = await supabase
      .from('consultation_messages')
      .select('*')
      .eq('token_id', tokenId)
      .order('created_at', { ascending: true })
    if (!error && data) setMessages(data)
    setLoading(false)
  }, [tokenId])

  useEffect(() => {
    if (!tokenId) return
    loadMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${tokenId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'consultation_messages',
        filter: `token_id=eq.${tokenId}`,
      }, (payload) => {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
      })
      .subscribe(status => setChannelStatus(status))

    channelRef.current = channel
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [tokenId, loadMessages])

  /**
   * Send a text message
   */
  const sendText = useCallback(async (text, senderRole) => {
    if (!text.trim() || !tokenId) return
    const { error } = await supabase.from('consultation_messages').insert({
      token_id:     tokenId,
      patient_id:   patientId,
      doctor_id:    doctorId,
      sender_role:  senderRole,
      message_type: 'text',
      content:      text.trim(),
    })
    if (error) throw error
  }, [tokenId, patientId, doctorId])

  /**
   * Send a media message (audio/video/image)
   * Uploads to Cloudinary first, then stores URL in Supabase
   */
  const sendMedia = useCallback(async (file, messageType, senderRole, duration = null) => {
    if (!file || !tokenId) return

    // Upload to Cloudinary
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'chikitsak_unsigned'
    const resourceType = messageType === 'image' ? 'image' : 'video' // Cloudinary uses 'video' for audio too

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)
    formData.append('folder', `chikitsak/chat/${tokenId}`)

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      { method: 'POST', body: formData }
    )
    if (!res.ok) throw new Error('Cloudinary upload failed')
    const data = await res.json()

    // Store only the URL in Supabase
    const { error } = await supabase.from('consultation_messages').insert({
      token_id:     tokenId,
      patient_id:   patientId,
      doctor_id:    doctorId,
      sender_role:  senderRole,
      message_type: messageType,
      content:      data.secure_url,   // Cloudinary CDN URL
      duration:     duration,
      file_name:    file.name,
    })
    if (error) throw error
    return data.secure_url
  }, [tokenId, patientId, doctorId])

  return { messages, loading, channelStatus, sendText, sendMedia }
}
