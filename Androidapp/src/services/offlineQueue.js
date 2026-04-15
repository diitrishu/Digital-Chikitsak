// services/offlineQueue.js
// Outbox pattern for offline actions using AsyncStorage
// When user is offline, actions are queued. When back online, they are flushed.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_KEY = '@dc_offline_queue';

export async function enqueueAction(type, payload) {
  const existing = await getQueue();
  const action = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    timestamp: Date.now(),
    retries: 0
  };
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...existing, action]));
  return action.id;
}

export async function getQueue() {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

async function removeAction(id) {
  const queue = (await getQueue()).filter(a => a.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function flushQueue() {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return;

  const queue = await getQueue();
  if (queue.length === 0) return;

  const token = await SecureStore.getItemAsync('auth_token') || '';
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';

  for (const action of queue) {
    try {
      if (action.type === 'SUBMIT_SYMPTOMS') {
        const res = await fetch(`${apiUrl}/ai/voice-analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(action.payload)
        });
        if (res.ok) await removeAction(action.id);
      }
      if (action.type === 'ADD_REMINDER') {
        const res = await fetch(`${apiUrl}/medication-reminders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(action.payload)
        });
        if (res.ok) await removeAction(action.id);
      }
      // Add more action types as needed
    } catch {
      // Increment retries, remove after 3 failures
      const updatedQueue = await getQueue();
      const idx = updatedQueue.findIndex(a => a.id === action.id);
      if (idx !== -1) {
        updatedQueue[idx].retries += 1;
        if (updatedQueue[idx].retries >= 3) {
          await removeAction(action.id);
        } else {
          await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
        }
      }
    }
  }
}

// Call this once in App.js to auto-flush when connection restores
export function setupOfflineSync() {
  NetInfo.addEventListener(state => {
    if (state.isConnected) flushQueue();
  });
}
