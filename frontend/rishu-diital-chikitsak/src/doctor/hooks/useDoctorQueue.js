/**
 * useDoctorQueue — Doctor-side Realtime queue hook
 *
 * Subscribes to tokens + doctors tables for a specific doctor.
 * Exposes callNext, markDone, setStatus actions.
 *
 * @param {string|null} doctorId
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../shared/services/supabase'
import {
  getDoctorQueue,
  callNext as callNextService,
  markDone as markDoneService,
  updateDoctorStatus,
} from '../../patient/services/queueService'

export function useDoctorQueue(doctorId) {
  const [queue, setQueue] = useState([])
  const [doctorStatus, setDoctorStatus] = useState('offline')
  const [currentToken, setCurrentToken] = useState(null)
  const [channelStatus, setChannelStatus] = useState('CONNECTING')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const tokensChannelRef = useRef(null)
  const doctorChannelRef = useRef(null)

  const refreshQueue = useCallback(async () => {
    if (!doctorId) return
    try {
      const q = await getDoctorQueue(doctorId)
      setQueue(q)
    } catch (err) {
      setError(err?.message || 'Failed to load queue')
    }
  }, [doctorId])

  const refreshDoctor = useCallback(async () => {
    if (!doctorId) return
    try {
      const { data } = await supabase
        .from('doctors')
        .select('status, current_patient_id, name, specialization')
        .eq('id', doctorId)
        .single()
      if (data) {
        setDoctorStatus(data.status)
        // Fetch current in_consultation token if in_call
        if (data.status === 'in_call' && data.current_patient_id) {
          const { data: tok } = await supabase
            .from('tokens')
            .select('id, jitsi_room, token_number, priority, patients(name)')
            .eq('doctor_id', doctorId)
            .eq('status', 'in_consultation')
            .maybeSingle()
          setCurrentToken(tok ?? null)
        } else {
          setCurrentToken(null)
        }
      }
    } catch (err) {
      setError(err?.message || 'Failed to load doctor status')
    }
  }, [doctorId])

  useEffect(() => {
    if (!doctorId) return

    setLoading(true)
    Promise.all([refreshQueue(), refreshDoctor()]).finally(() => setLoading(false))

    // Subscribe to tokens changes
    const tokensChannel = supabase
      .channel(`doctor-tokens:${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tokens',
          filter: `doctor_id=eq.${doctorId}`,
        },
        () => { refreshQueue(); refreshDoctor() }
      )
      .subscribe((status) => setChannelStatus(status))

    // Subscribe to doctor row changes
    const doctorChannel = supabase
      .channel(`doctor-status:${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'doctors',
          filter: `id=eq.${doctorId}`,
        },
        () => { refreshDoctor() }
      )
      .subscribe()

    tokensChannelRef.current = tokensChannel
    doctorChannelRef.current = doctorChannel

    return () => {
      if (tokensChannelRef.current) supabase.removeChannel(tokensChannelRef.current)
      if (doctorChannelRef.current) supabase.removeChannel(doctorChannelRef.current)
    }
  }, [doctorId, refreshQueue, refreshDoctor])

  const callNext = useCallback(async () => {
    if (!doctorId) return
    setError(null)
    try {
      const token = await callNextService(doctorId)
      setCurrentToken(token)
      await refreshDoctor()
    } catch (err) {
      const msg = err?.message || 'Failed to call next patient'
      setError(msg)
      throw err
    }
  }, [doctorId, refreshDoctor])

  const markDone = useCallback(async (tokenId) => {
    if (!doctorId || !tokenId) return
    setError(null)
    try {
      await markDoneService(tokenId, doctorId)
      setCurrentToken(null)
      await Promise.all([refreshQueue(), refreshDoctor()])
    } catch (err) {
      const msg = err?.message || 'Failed to mark consultation done'
      setError(msg)
      throw err
    }
  }, [doctorId, refreshQueue, refreshDoctor])

  const setStatus = useCallback(async (status) => {
    if (!doctorId) return
    setError(null)
    try {
      await updateDoctorStatus(doctorId, status)
      setDoctorStatus(status)
    } catch (err) {
      const msg = err?.message || 'Failed to update status'
      setError(msg)
      throw err
    }
  }, [doctorId])

  return {
    queue,
    doctorStatus,
    currentToken,
    channelStatus,
    loading,
    error,
    callNext,
    markDone,
    setStatus,
    refresh: () => Promise.all([refreshQueue(), refreshDoctor()]),
  }
}
