import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline_sync_queue';

export const useNetworkStore = create((set, get) => ({
  isConnected: true,
  lastSynced: null,
  syncQueue: [],
  isSyncing: false,

  setConnected: (val) => set({ isConnected: val }),
  setLastSynced: () => set({ lastSynced: new Date().toISOString() }),

  // Load persisted queue from AsyncStorage on app start
  loadQueue: async () => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (raw) set({ syncQueue: JSON.parse(raw) });
    } catch (_) {}
  },

  // Add an action to the queue (when offline)
  enqueue: async (action) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      retries: 0,
      ...action,
    };
    const queue = [...get().syncQueue, entry];
    set({ syncQueue: queue });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return entry.id;
  },

  // Remove a successfully synced action
  dequeue: async (id) => {
    const queue = get().syncQueue.filter((a) => a.id !== id);
    set({ syncQueue: queue });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  setSyncing: (val) => set({ isSyncing: val }),
}));
