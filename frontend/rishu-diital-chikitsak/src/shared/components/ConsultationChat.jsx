/**
 * ConsultationChat — Full async chat between patient and doctor
 *
 * Features:
 * - Text messages
 * - Voice notes (record in browser via MediaRecorder)
 * - Video messages (record in browser)
 * - File/image/document upload
 * - Prescription text (doctor only)
 * - All media → Cloudinary → only URL stored in Supabase
 * - Supabase Realtime for live updates
 *
 * Props:
 *   patientId   {string}
 *   doctorId    {string}
 *   tokenId     {string|null}  optional — links to a consultation token
 *   senderRole  {'patient'|'doctor'}
 *   senderName  {string}
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Mic, MicOff, Video, VideoOff, Paperclip,
  Play, Pause, FileText, Image, X, Check, CheckCheck,
  Loader, AlertCircle, Stethoscope, User
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../services/supabase'

const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET    = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'chikitsak_unsigned'

// ── Upload to Cloudinary ──────────────────────────────────────────────────────
async function uploadToCloudinary(blob, resourceType, folder) {
  const form = new FormData()
  form.append('file', blob)
  form.append('upload_preset', UPLOAD_PRESET)
  form.append('folder', folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`,
    { method: 'POST', body: form }
  )
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json()
  return { url: data.secure_url, duration: data.duration || null, publicId: data.public_id }
}

// ── Audio player component ────────────────────────────────────────────────────
function AudioPlayer({ url, duration }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef(null)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={e => setProgress((e.target.currentTime / e.target.duration) * 100 || 0)}
        onEnded={() => { setPlaying(false); setProgress(0) }}
      />
      <button onClick={toggle} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-white/70 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      {duration && <span className="text-xs opacity-70">{Math.round(duration)}s</span>}
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine }) {
  const bg = isMine ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-gray-100'
  const align = isMine ? 'items-end' : 'items-start'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col ${align} gap-1 max-w-[80%] ${isMine ? 'self-end' : 'self-start'}`}
    >
      <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${bg} ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
        {msg.message_type === 'text' && (
          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
        )}

        {msg.message_type === 'audio' && (
          <AudioPlayer url={msg.content} duration={msg.duration} />
        )}

        {msg.message_type === 'video' && (
          <video
            src={msg.content}
            controls
            className="rounded-xl max-w-[240px] max-h-[180px]"
          />
        )}

        {msg.message_type === 'image' && (
          <img
            src={msg.content}
            alt="attachment"
            className="rounded-xl max-w-[240px] cursor-pointer"
            onClick={() => window.open(msg.content, '_blank')}
          />
        )}

        {msg.message_type === 'document' && (
          <a
            href={msg.content}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm underline"
          >
            <FileText size={16} />
            {msg.file_name || 'Document'}
          </a>
        )}
      </div>

      <span className="text-[10px] text-gray-400 px-1">
        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        {isMine && <CheckCheck size={12} className="inline ml-1 text-blue-400" />}
      </span>
    </motion.div>
  )
}

// ── Recording indicator ───────────────────────────────────────────────────────
function RecordingIndicator({ type, seconds, onStop }) {
  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      <span className="text-sm font-medium text-red-700">
        Recording {type}… {seconds}s
      </span>
      <button onClick={onStop} className="ml-auto bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-semibold">
        Stop
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ConsultationChat({ patientId, doctorId, tokenId, senderRole, senderName }) {
  const [messages, setMessages]       = useState([])
  const [text, setText]               = useState('')
  const [sending, setSending]         = useState(false)
  const [loading, setLoading]         = useState(true)
  const [channelStatus, setChannelStatus] = useState('CONNECTING')

  // Recording state
  const [recordingType, setRecordingType] = useState(null) // 'audio' | 'video' | null
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const recordedChunks = useRef([])
  const timerRef = useRef(null)
  const videoPreviewRef = useRef(null)

  const messagesEndRef = useRef(null)
  const fileInputRef   = useRef(null)
  const channelRef     = useRef(null)

  const folder = `chikitsak/chat/${patientId}-${doctorId}`

  // ── Load messages ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!patientId || !doctorId) return

    async function load() {
      let query = supabase
        .from('consultation_messages')
        .select('*')
        .eq('patient_id', patientId)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: true })

      if (tokenId) query = query.eq('token_id', tokenId)

      const { data } = await query
      setMessages(data || [])
      setLoading(false)
    }
    load()

    // Realtime subscription — filter by doctor_id (always present)
    // Use doctor_id as the Supabase filter (single column required)
    // Then filter client-side for the specific patient
    const channel = supabase
      .channel(`chat:${patientId}:${doctorId}:${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'consultation_messages',
        filter: `doctor_id=eq.${doctorId}`,
      }, payload => {
        const msg = payload.new
        // Client-side filter: only show messages for this patient↔doctor pair
        if (msg.patient_id !== patientId) return
        if (tokenId && msg.token_id && msg.token_id !== tokenId) return
        setMessages(prev =>
          prev.find(m => m.id === msg.id) ? prev : [...prev, msg]
        )
      })
      .subscribe(s => {
        setChannelStatus(s)
        if (s === 'CHANNEL_ERROR') {
          // Retry on error
          setTimeout(() => channel.subscribe(), 2000)
        }
      })

    channelRef.current = channel
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [patientId, doctorId, tokenId])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Insert message to Supabase ──────────────────────────────────────────────
  const insertMessage = useCallback(async (type, content, extra = {}) => {
    const { error } = await supabase.from('consultation_messages').insert({
      token_id:     tokenId || null,
      patient_id:   patientId,
      doctor_id:    doctorId,
      sender_role:  senderRole,
      message_type: type,
      content,
      ...extra,
    })
    if (error) throw error
  }, [tokenId, patientId, doctorId, senderRole])

  // ── Send text ───────────────────────────────────────────────────────────────
  const handleSendText = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await insertMessage('text', text.trim())
      setText('')
    } catch { toast.error('Failed to send') }
    finally { setSending(false) }
  }

  // ── Start recording ─────────────────────────────────────────────────────────
  const startRecording = async (type) => {
    try {
      const constraints = type === 'audio'
        ? { audio: true }
        : { audio: true, video: { width: 640, height: 480 } }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      if (type === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream
        videoPreviewRef.current.play()
      }

      const mr = new MediaRecorder(stream, {
        mimeType: type === 'audio' ? 'audio/webm' : 'video/webm'
      })
      recordedChunks.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) recordedChunks.current.push(e.data) }
      mr.start(100)

      setMediaRecorder(mr)
      setRecordingType(type)
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch (err) {
      toast.error(`Cannot access ${type === 'audio' ? 'microphone' : 'camera'}`)
    }
  }

  // ── Stop recording & upload ─────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (!mediaRecorder) return
    clearInterval(timerRef.current)

    mediaRecorder.onstop = async () => {
      const mimeType = recordingType === 'audio' ? 'audio/webm' : 'video/webm'
      const blob = new Blob(recordedChunks.current, { type: mimeType })
      const duration = recordingSeconds

      // Stop all tracks
      mediaRecorder.stream.getTracks().forEach(t => t.stop())
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null

      setSending(true)
      try {
        const resourceType = recordingType === 'audio' ? 'video' : 'video' // Cloudinary uses 'video' for audio
        const { url } = await uploadToCloudinary(blob, resourceType, folder)
        await insertMessage(recordingType, url, { duration, file_name: `${recordingType}_${Date.now()}.webm` })
        toast.success(`${recordingType === 'audio' ? 'Voice note' : 'Video'} sent!`)
      } catch { toast.error('Upload failed') }
      finally { setSending(false) }
    }

    mediaRecorder.stop()
    setMediaRecorder(null)
    setRecordingType(null)
    setRecordingSeconds(0)
  }, [mediaRecorder, recordingType, recordingSeconds, folder, insertMessage])

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    const isAudio = file.type.startsWith('audio/')
    const resourceType = (isImage) ? 'image' : 'video'
    const msgType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'document'

    setSending(true)
    try {
      if (msgType === 'document') {
        // Documents: use raw upload
        const form = new FormData()
        form.append('file', file)
        form.append('upload_preset', UPLOAD_PRESET)
        form.append('folder', folder)
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/raw/upload`,
          { method: 'POST', body: form }
        )
        const data = await res.json()
        await insertMessage('document', data.secure_url, { file_name: file.name })
      } else {
        const { url, duration } = await uploadToCloudinary(file, resourceType, folder)
        await insertMessage(msgType, url, { file_name: file.name, duration })
      }
      toast.success('File sent!')
    } catch { toast.error('Upload failed') }
    finally { setSending(false) }
  }

  const isDoctor = senderRole === 'doctor'

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isDoctor ? 'bg-blue-100' : 'bg-teal-100'}`}>
          {isDoctor ? <User size={18} className="text-blue-600" /> : <Stethoscope size={18} className="text-teal-600" />}
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">{senderName}</p>
          <div className={`flex items-center gap-1 text-xs ${channelStatus === 'SUBSCRIBED' ? 'text-green-500' : 'text-yellow-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${channelStatus === 'SUBSCRIBED' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            {channelStatus === 'SUBSCRIBED' ? 'Live' : 'Connecting…'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader size={24} className="animate-spin text-gray-300" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Stethoscope size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm">No messages yet</p>
            <p className="text-gray-300 text-xs mt-1">
              {isDoctor ? 'Patient will describe their problem here' : 'Describe your problem to the doctor'}
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMine={msg.sender_role === senderRole}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Video preview while recording */}
      {recordingType === 'video' && (
        <div className="px-4 pb-2">
          <video
            ref={videoPreviewRef}
            muted
            className="w-full max-h-32 rounded-xl bg-black object-cover"
          />
        </div>
      )}

      {/* Recording indicator */}
      {recordingType && (
        <div className="px-4 pb-2">
          <RecordingIndicator
            type={recordingType}
            seconds={recordingSeconds}
            onStop={stopRecording}
          />
        </div>
      )}

      {/* Sending indicator */}
      {sending && (
        <div className="px-4 pb-1 flex items-center gap-2 text-xs text-gray-400">
          <Loader size={12} className="animate-spin" />
          Uploading…
        </div>
      )}

      {/* Input area */}
      <div className="bg-white border-t border-gray-100 px-3 py-3">
        <div className="flex items-end gap-2">
          {/* Attachment */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || !!recordingType}
            className="p-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 flex-shrink-0"
            title="Attach file, image, or document"
          >
            <Paperclip size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Voice note */}
          <button
            onClick={() => recordingType === 'audio' ? stopRecording() : startRecording('audio')}
            disabled={sending || recordingType === 'video'}
            className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
              recordingType === 'audio'
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40'
            }`}
            title="Voice note"
          >
            {recordingType === 'audio' ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Video message */}
          <button
            onClick={() => recordingType === 'video' ? stopRecording() : startRecording('video')}
            disabled={sending || recordingType === 'audio'}
            className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
              recordingType === 'video'
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40'
            }`}
            title="Video message"
          >
            {recordingType === 'video' ? <VideoOff size={18} /> : <Video size={18} />}
          </button>

          {/* Text input */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText() } }}
            placeholder={isDoctor ? 'Write your diagnosis or advice…' : 'Describe your problem…'}
            rows={1}
            disabled={sending || !!recordingType}
            className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none disabled:opacity-40"
            style={{ maxHeight: '100px', overflowY: 'auto' }}
          />

          {/* Send */}
          <button
            onClick={handleSendText}
            disabled={!text.trim() || sending || !!recordingType}
            className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 flex-shrink-0 transition-colors"
          >
            {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>

        {/* Doctor quick actions */}
        {isDoctor && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {['Drink plenty of water', 'Take rest for 2 days', 'Prescribed medicines sent', 'Follow up in 3 days'].map(q => (
              <button
                key={q}
                onClick={() => setText(q)}
                className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
