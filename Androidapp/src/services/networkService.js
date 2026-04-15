import NetInfo from '@react-native-community/netinfo';
import { useNetworkStore } from 'src/store/useNetworkStore';
import api from 'src/services/api';
import { flushQueue } from 'src/services/offlineQueue';

let unsubscribe = null;
let pollingInterval = null;

// ------------------------------------------------------------------
// Sync Engine — processes the offline queue when back online
// ------------------------------------------------------------------
export async function runSyncEngine() {
  const store = useNetworkStore.getState();
  if (store.isSyncing || store.syncQueue.length === 0) return;

  store.setSyncing(true);
  console.log(`[Sync] Processing ${store.syncQueue.length} pending actions…`);

  for (const action of [...store.syncQueue]) {
    try {
      if (action.type === 'POST') {
        await api.post(action.endpoint, action.payload);
      } else if (action.type === 'PUT') {
        await api.put(action.endpoint, action.payload);
      } else if (action.type === 'DELETE') {
        await api.delete(action.endpoint);
      }
      await store.dequeue(action.id);
      console.log(`[Sync] ✅ ${action.id} synced`);
    } catch (err) {
      console.warn(`[Sync] ❌ ${action.id} failed: ${err.message}`);
      // Keep in queue for next retry
    }
  }

  store.setSyncing(false);
  store.setLastSynced();
}

// ------------------------------------------------------------------
// Start listening to connection changes
// ------------------------------------------------------------------
export function startNetworkListener() {
  const store = useNetworkStore.getState();
  store.loadQueue();

  // Real-time listener
  unsubscribe = NetInfo.addEventListener((state) => {
    const connected = !!(state.isConnected && state.isInternetReachable !== false);
    const wasOffline = !useNetworkStore.getState().isConnected;
    useNetworkStore.getState().setConnected(connected);

    if (connected && wasOffline) {
      console.log('[Network] 🟢 Back online — starting sync');
      runSyncEngine();
      flushQueue();
    }
  });

  // Fallback polling every 30 seconds (catches "lie-fi" — connected but no internet)
  pollingInterval = setInterval(async () => {
    const state = await NetInfo.fetch();
    const connected = !!(state.isConnected && state.isInternetReachable !== false);
    useNetworkStore.getState().setConnected(connected);
    if (connected && useNetworkStore.getState().syncQueue.length > 0) {
      runSyncEngine();
      flushQueue();
    }
  }, 30000);
}

export function stopNetworkListener() {
  if (unsubscribe) unsubscribe();
  if (pollingInterval) clearInterval(pollingInterval);
}
