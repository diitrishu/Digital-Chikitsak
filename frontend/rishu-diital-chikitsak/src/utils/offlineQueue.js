// offlineQueue.js
// localStorage-based pending action queue for offline support.
// When the device is offline, actions are saved here and flushed when back online.

const QUEUE_KEY = 'dc_offline_queue'

export function enqueueAction(action) {
  const queue = getQueue()
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    retries: 0,
    ...action,
  }
  queue.push(entry)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  return entry.id
}

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

export function removeFromQueue(id) {
  const queue = getQueue().filter(item => item.id !== id)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY)
}

// Call this when internet reconnects (wired up in OfflineMode.jsx)
export async function flushQueue(apiBaseUrl, authToken) {
  const queue = getQueue()
  if (queue.length === 0) return

  for (const action of queue) {
    try {
      if (action.type === 'SUBMIT_SYMPTOMS') {
        await fetch(`${apiBaseUrl}/ai/voice-analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(action.payload),
        })
        removeFromQueue(action.id)
      }
      // Add more action types here as needed
    } catch {
      // Increment retry count, give up after 3 attempts
      const current = getQueue()
      const idx = current.findIndex(q => q.id === action.id)
      if (idx !== -1) {
        current[idx].retries = (current[idx].retries || 0) + 1
        if (current[idx].retries >= 3) {
          removeFromQueue(action.id)
        } else {
          localStorage.setItem(QUEUE_KEY, JSON.stringify(current))
        }
      }
    }
  }
}
