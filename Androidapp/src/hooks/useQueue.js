import { useEffect, useRef, useCallback } from 'react';
import { supabase } from 'src/services/supabase';
import { useQueueStore } from 'src/store/useQueueStore';
import { sortQueueTokens, getEstimatedWait, getJitsiRoomId } from 'src/services/queueService';
import { sendQueueTurnNotification } from 'src/services/notificationService';

export function useQueue(doctorId, tokenId, myTokenNumber) {
  const channelRef = useRef(null);
  const store = useQueueStore();

  const fetchQueue = useCallback(async () => {
    if (!doctorId) return;
    const { data } = await supabase.from('tokens').select('*, patients(name, age)')
      .eq('doctor_id', doctorId).eq('status', 'waiting').order('token_number', { ascending: true });

    const sorted = sortQueueTokens(data || []);
    store.updateQueue(sorted);

    const pos = sorted.findIndex(t => t.id === tokenId);
    store.setMyPosition(pos >= 0 ? pos : 0);
    store.setEstimatedWait(getEstimatedWait(pos >= 0 ? pos : 0));

    // Check if my turn
    const { data: myToken } = await supabase.from('tokens').select('status, jitsi_room')
      .eq('id', tokenId).single();

    if (myToken?.status === 'in_consultation') {
      const wasNotMyTurn = !store.isMyTurn;
      store.setIsMyTurn(true);
      store.setJitsiRoomId(myToken.jitsi_room || getJitsiRoomId(tokenId));
      
      if (wasNotMyTurn && myTokenNumber) {
        sendQueueTurnNotification(myTokenNumber);
      }
    }
  }, [doctorId, tokenId, myTokenNumber]);

  useEffect(() => {
    if (!doctorId) return;
    fetchQueue();

    const channel = supabase.channel(`queue-${doctorId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens', filter: `doctor_id=eq.${doctorId}` }, () => fetchQueue())
      .subscribe((status) => store.setChannelStatus(status));

    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [doctorId, tokenId]);

  return {
    queue: store.queue,
    myPosition: store.myPosition,
    estimatedWait: store.estimatedWait,
    isMyTurn: store.isMyTurn,
    jitsiRoomId: store.jitsiRoomId,
    channelStatus: store.channelStatus,
    refresh: fetchQueue,
  };
}
