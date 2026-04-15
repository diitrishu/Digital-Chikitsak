// src/utils/offlineManager.js
import React from 'react';

export class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pendingRequests = [];
    this.cache = new Map();
    this.init();
  }

  init() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processPendingRequests();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Load pending requests from localStorage
    this.loadPendingRequests();
  }

  // Check if we're online
  getIsOnline() {
    return this.isOnline;
  }

  // Save data to cache
  saveToCache(key, data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
      this.cache.set(key, cacheData);
    } catch (error) {
      console.error('Failed to save to cache:', error);
    }
  }

  // Load data from cache
  loadFromCache(key) {
    try {
      // Check memory cache first
      if (this.cache.has(key)) {
        const cached = this.cache.get(key);
        if (cached.expires > Date.now()) {
          return cached.data;
        } else {
          this.cache.delete(key);
        }
      }

      // Check localStorage
      const cachedData = localStorage.getItem(`cache_${key}`);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (parsed.expires > Date.now()) {
          this.cache.set(key, parsed);
          return parsed.data;
        } else {
          localStorage.removeItem(`cache_${key}`);
        }
      }
    } catch (error) {
      console.error('Failed to load from cache:', error);
    }
    return null;
  }

  // Queue request for offline processing
  queueRequest(url, options) {
    const request = {
      id: Date.now() + Math.random(),
      url,
      options,
      timestamp: Date.now()
    };

    this.pendingRequests.push(request);
    this.savePendingRequests();
    return request.id;
  }

  // Save pending requests to localStorage
  savePendingRequests() {
    try {
      localStorage.setItem('pendingRequests', JSON.stringify(this.pendingRequests));
    } catch (error) {
      console.error('Failed to save pending requests:', error);
    }
  }

  // Load pending requests from localStorage
  loadPendingRequests() {
    try {
      const saved = localStorage.getItem('pendingRequests');
      if (saved) {
        this.pendingRequests = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    }
  }

  // Process pending requests when online
  async processPendingRequests() {
    if (!this.isOnline || this.pendingRequests.length === 0) {
      return;
    }

    const processed = [];
    for (const request of this.pendingRequests) {
      try {
        const response = await fetch(request.url, request.options);
        if (response.ok) {
          processed.push(request.id);
        }
      } catch (error) {
        console.error('Failed to process pending request:', error);
      }
    }

    // Remove processed requests
    this.pendingRequests = this.pendingRequests.filter(
      request => !processed.includes(request.id)
    );
    this.savePendingRequests();
  }

  // Make a fetch request with offline support
  async fetchWithOfflineSupport(url, options = {}) {
    // Try to get from cache first if it's a GET request
    if (options.method === 'GET' || !options.method) {
      const cached = this.loadFromCache(url);
      if (cached) {
        return { ok: true, data: cached, fromCache: true };
      }
    }

    // If online, make the request
    if (this.isOnline) {
      try {
        const response = await fetch(url, options);
        if (response.ok) {
          const data = await response.json();
          
          // Cache GET requests
          if (options.method === 'GET' || !options.method) {
            this.saveToCache(url, data);
          }
          
          return { ok: true, data, fromCache: false };
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        // If online but request fails, queue for later
        this.queueRequest(url, options);
        return { ok: false, error: error.message };
      }
    } else {
      // If offline, queue the request
      this.queueRequest(url, options);
      return { ok: false, error: 'Offline mode' };
    }
  }
}

// Create a singleton instance
export const offlineManager = new OfflineManager();

// Hook for React components to detect online status
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = React.useState(offlineManager.getIsOnline());

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};