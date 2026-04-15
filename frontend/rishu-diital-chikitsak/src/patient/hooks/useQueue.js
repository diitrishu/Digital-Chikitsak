/**
 * useQueue — Patient-side Realtime queue hook
 *
 * Subscribes to the tokens table for a specific doctor.
 * Updates instantly when any token changes — no polling.
 *
 * @param {string|null} doctorId
 * @param {string|null} myTokenId
 * @param {number|null} myTokenNumber
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../shared/services/supabase'
import {
  getDoctorQueue,
  getQueuePosition,
  getEstimatedWait,
} from '../services/queueService'

export function useQueue(doctorId, myTokenId, myTokenNumber) {
  const [queue, setQueue] = useState([])
  const [myPosition, setMyPosition] = useState(0)
  const [estimatedWait, setEstimatedWait] = useState(0)
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [jitsiRoomId, setJitsiRoomId] = useState(null)
  const [myTokenStatus, setMyTokenStatus] = useState('waiting')
  const [channelStatus, setChannelStatus] = useState('CONNECTING')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const channelRef = useRef(null)

  const refresh = useCallback(async () => {
    if (!doctorId || !myTokenId) return
    try {
      const [queueData, posData] = await Promise.all([
        getDoctorQueue(doctorId),
        getQueuePosition({ tokenId: myTokenId, doctorId, myTokenNumber }),
      ])

      setQueue(queueData)
      setMyPosition(posData.position)
      setEstimatedWait(posData.estimatedWait)
      setMyTokenStatus(posData.status)

      const turnNow = posData.status === 'in_consultation'
      setIsMyTurn(turnNow)

      if (turnNow) {
        // Fetch jitsi_room from token record
        const { data: tokenRow } = await supabase
          .from('tokens')
          .select('jitsi_room')
          .eq('id', myTokenId)
          .single()
        setJitsiRoomId(tokenRow?.jitsi_room ?? null)
      } else {
        setJitsiRoomId(null)
      }
    } catch (err) {
      setError(err?.message || 'Failed to load queue')
    }
  }, [doctorId, myTokenId, myTokenNumber])

  useEffect(() => {
    if (!doctorId || !myTokenId) return

    setLoading(true)
    refresh().finally(() => setLoading(false))

    // Subscribe to tokens table changes for this doctor
    const channel = supabase
      .channel(`queue:${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tokens',
          filter: `doctor_id=eq.${doctorId}`,
        },
        () => { refresh() }
      )
      .subscribe((status) => {
        setChannelStatus(status)
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [doctorId, myTokenId, refresh])

  return {
    queue,
    myPosition,
    estimatedWait,
    isMyTurn,
    jitsiRoomId,
    myTokenStatus,
    channelStatus,
    loading,
    error,
    refresh,
  }
}
