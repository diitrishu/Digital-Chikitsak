import React, { useState, useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import router from './router'
import LanguageSelector from './shared/components/LanguageSelector'
import { LanguageProvider } from './shared/contexts/LanguageContext'
import OfflineMode from './shared/components/OfflineMode'
import LowBandwidthMode from './shared/components/LowBandwidthMode'

export default function App() {
  const [showLanguageSelector, setShowLanguageSelector] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lowBandwidthMode, setLowBandwidthMode] = useState(false)

  useEffect(() => {
    // Force language selector to show first (project specification requirement)
    localStorage.removeItem('selectedLanguage')
    
    // Check if user has selected a language before
    const savedLanguage = localStorage.getItem('selectedLanguage')
    
    if (savedLanguage) {
      setShowLanguageSelector(false)
    }
    
    // Check for low bandwidth mode
    const savedLowBandwidth = localStorage.getItem('lowBandwidthMode')
    if (savedLowBandwidth === 'true') {
      setLowBandwidthMode(true)
    }
    
    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleLanguageSelect = (language) => {
    localStorage.setItem('selectedLanguage', language)
    setShowLanguageSelector(false)
  }

  const handleRetry = () => {
    window.location.reload()
  }

  const toggleLowBandwidthMode = (enabled) => {
    setLowBandwidthMode(enabled)
    localStorage.setItem('lowBandwidthMode', enabled.toString())
  }

  // Mandatory language selection - must be shown first per project specification
  if (showLanguageSelector) {
    return <LanguageSelector onLanguageSelect={handleLanguageSelect} />
  }

  return (
    <LanguageProvider>
      <>
        {/* Error boundary wrapper */}
        <div className="error-boundary">
          {!isOnline && <OfflineMode onRetry={handleRetry} />}
          <LowBandwidthMode 
            isActive={lowBandwidthMode} 
            onToggle={toggleLowBandwidthMode} 
          />
          <RouterProvider router={router} />
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </>
    </LanguageProvider>
  )
}