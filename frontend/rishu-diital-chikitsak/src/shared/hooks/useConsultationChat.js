/**
 * useConsultationChat — Realtime chat hook for both patient and doctor
 *
 * Subscribes to consultation_messages for a given token_id.
 * Handles text, audio, video, image messages.
 * Media is stored in Cloudinary; only the URL is stored in Supabase.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../services/supabase'

const CLOUDINARY_CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET     = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'chikitsak_unsigned'
const MAX_FILE_BYTES    = 20 * 1024 * 1024  // 20 MB

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

    const channel = supabase
      .channel(`chat:${tokenId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'consultation_messages',
        filter: `token_id=eq.${tokenId}`,
      }, (payload) => {
        setMessages(prev => {
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
    if (error) throw new Error(error.message)
  }, [tokenId, patientId, doctorId])

  /**
   * Send a media message (audio/video/image/document)
   * Validates size, uploads to Cloudinary, stores URL in Supabase.
   */
  const sendMedia = useCallback(async (file, messageType, senderRole, duration = null) => {
    if (!file || !tokenId) return

    // Size guard
    if (file.size > MAX_FILE_BYTES) {
      throw new Error('File too large. Maximum size is 20 MB.')
    }

    // Validate Cloudinary config
    if (!CLOUDINARY_CLOUD || CLOUDINARY_CLOUD === 'your_cloudinary_cloud_name') {
      throw new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME in your .env file.')
    }

    // Cloudinary resource type: 'image' for images, 'video' for audio/video, 'raw' for docs
    const isDocument = messageType === 'document'
    const resourceType = isDocument ? 'raw' : messageType === 'image' ? 'image' : 'video'

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('folder', `chikitsak/chat/${tokenId}`)

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`,
      { method: 'POST', body: formData }
    )

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data?.error?.message || `Cloudinary upload failed (HTTP ${res.status})`)
    }

    if (!data.secure_url) {
      throw new Error('Cloudinary did not return a file URL')
    }

    // Store only the URL in Supabase
    const { error } = await supabase.from('consultation_messages').insert({
      token_id:     tokenId,
      patient_id:   patientId,
      doctor_id:    doctorId,
      sender_role:  senderRole,
      message_type: messageType,
      content:      data.secure_url,
      duration:     duration,
      file_name:    file.name,
    })
    if (error) throw new Error(error.message)

    return data.secure_url
  }, [tokenId, patientId, doctorId])

  return { messages, loading, channelStatus, sendText, sendMedia }
}
