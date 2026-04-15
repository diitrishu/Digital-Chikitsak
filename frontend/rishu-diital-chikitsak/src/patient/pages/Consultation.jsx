import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { getConsultation } from '../../shared/services/consultations'
import { getCurrentUser } from '../../shared/services/auth'
import { useLanguage } from '../../shared/contexts/LanguageContext'
import VideoConsultation from '../../shared/components/VideoConsultation'

export default function PatientConsultation() {
  const { id } = useParams() // consultation id
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [consultation, setConsultation] = useState(null)
  const [room, setRoom] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showVideoCall, setShowVideoCall] = useState(false)
  const [isInstantConsultation, setIsInstantConsultation] = useState(false)
  
  // Token system state
  const [doctorBusy, setDoctorBusy] = useState(false)
  const [tokenInfo, setTokenInfo] = useState(null)
  const [currentToken, setCurrentToken] = useState(1)
  const [nextToken, setNextToken] = useState(2)
  const [queuePosition, setQueuePosition] = useState(0)
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(0)

  useEffect(() => {
    (async () => {
      try {
        // Check if this is an instant consultation (no ID or special route)
        if (!id || window.location.pathname.includes('instant-consultation')) {
          createInstantRoom()
          setIsInstantConsultation(true)
        } else {
          // Regular consultation with ID
          const data = await getConsultation(id)
          if (data) {
            setConsultation(data)
            const link = data?.meeting_link || ''
            const r = link.split('/').pop()
            if (r) setRoom(r)
          } else {
            // If consultation not found, create an instant room
            createInstantRoom()
            setIsInstantConsultation(true)
          }
        }
        
        // Simulate doctor availability check
        const isDoctorBusy = Math.random() > 0.3 // 70% chance doctor is busy
        setDoctorBusy(isDoctorBusy)
        
        if (isDoctorBusy) {
          // Generate initial queue information
          setQueuePosition(Math.floor(Math.random() * 5) + 1)
          setEstimatedWaitTime(Math.floor(Math.random() * 30) + 5)
        }
      } catch (err) {
        console.error('Error loading consultation:', err)
        if ((err.response && err.response.status === 404) || (err.message && err.message.includes('not found'))) {
          // If consultation not found, create an instant room
          createInstantRoom()
          setIsInstantConsultation(true)
        } else {
          setError(t('videoConsult.failedToLoad'))
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [id, t])

  const createInstantRoom = () => {
    // Create an instant room with patient's name
    const user = getCurrentUser()
    const patientName = user?.name || user?.phone || 'patient'
    // Create a room name based on patient name in the format: meet.jit.si/name
    const roomName = patientName.replace(/\s+/g, '-').toLowerCase()
    setRoom(roomName)
  }

  const generateToken = () => {
    const tokenNumber = Math.floor(Math.random() * 1000) + 1
    const position = Math.floor(Math.random() * 5) + 1
    const waitTime = position * 5 // 5 minutes per patient ahead
    
    setTokenInfo({
      number: tokenNumber,
      status: 'active',
      generatedAt: new Date()
    })
    setQueuePosition(position)
    setEstimatedWaitTime(waitTime)
    
    // Simulate queue movement
    const interval = setInterval(() => {
      setQueuePosition(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setDoctorBusy(false)
          setTokenInfo(prev => ({ ...prev, status: 'completed' }))
          return 0
        }
        return prev - 1
      })
      setEstimatedWaitTime(prev => Math.max(0, prev - 5))
    }, 10000) // Update every 10 seconds for demo
  }

  const refreshTokenStatus = () => {
    if (queuePosition > 0) {
      setQueuePosition(prev => Math.max(0, prev - 1))
      setEstimatedWaitTime(prev => Math.max(0, prev - 5))
    }
  }

  const startVideoCall = () => {
    // Check if doctor is busy and patient doesn't have token
    if (doctorBusy && !tokenInfo) {
      return // Don't allow video call without token
    }
    
    // Only start video call if we have a room
    if (room) {
      try {
        setShowVideoCall(true)
      } catch (error) {
        console.error('Error starting video call:', error)
        setError(t('videoConsult.failedToStart'))
      }
    } else {
      setError(t('videoConsult.cannotStart'))
    }
  }

  const endVideoCall = () => {
    setShowVideoCall(false)
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return (
      <AppShell title="Consultation">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">{t('videoConsult.loading')}</div>
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell title="Consultation">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500 bg-red-50 p-4 rounded max-w-md text-center">
            <div className="font-semibold text-lg mb-2">{t('videoConsult.error')}</div>
            <div className="mb-4">{error}</div>
            <div className="space-y-2">
              <button onClick={() => navigate('/patient')} className="w-full px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600">
                {t('videoConsult.backToDashboard')}
              </button>
              <button onClick={() => navigate('/patient/book-doctor')} className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                {t('videoConsult.bookAConsultation')}
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  // If we're in video call mode, show the video consultation component
  if (showVideoCall && room) {
    const user = getCurrentUser()
    const displayName = user?.name || user?.phone || 'Patient'
    
    return (
      <VideoConsultation 
        roomName={room}
        displayName={displayName}
        onEndCall={endVideoCall}
        consultationId={isInstantConsultation ? null : id}
      />
    )
  }

  return (
    <AppShell title={isInstantConsultation ? 'Instant Consultation' : 'Consultation'}>
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-6">

          <h1 className="text-2xl font-semibold mb-4">
            {isInstantConsultation ? t('videoConsult.instantConsultation') : t('videoConsult.onlineConsultation')}
          </h1>

          {/* Doctor Busy / Token System */}
          {doctorBusy && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-3 text-yellow-800">{t('videoConsult.tokenSystem.doctorBusy')}</h2>
              
              {!tokenInfo ? (
                <div className="space-y-3">
                  <p className="text-yellow-700">{t('videoConsult.tokenSystem.joinQueue')}</p>
                  <button
                    onClick={generateToken}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                  >
                    {t('videoConsult.tokenSystem.generateToken')}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded border">
                      <h3 className="font-medium text-gray-700">{t('videoConsult.tokenSystem.yourToken')}</h3>
                      <p className="text-2xl font-bold text-yellow-600">#{tokenInfo.number}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <h3 className="font-medium text-gray-700">{t('videoConsult.tokenSystem.queuePosition')}</h3>
                      <p className="text-xl font-semibold">
                        {queuePosition > 0 ? `${queuePosition} ${t('videoConsult.tokenSystem.patientsAhead')}` : t('videoConsult.tokenSystem.yourTurn')}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <h3 className="font-medium text-gray-700">{t('videoConsult.tokenSystem.estimatedWaitTime')}</h3>
                      <p className="text-xl font-semibold">
                        {estimatedWaitTime > 0 ? `${estimatedWaitTime} ${t('videoConsult.tokenSystem.minutes')}` : t('videoConsult.tokenSystem.doctorAvailable')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={refreshTokenStatus}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      {t('videoConsult.tokenSystem.refreshStatus')}
                    </button>
                    
                    {queuePosition === 0 && (
                      <div className="px-4 py-2 bg-green-100 text-green-800 rounded border border-green-200">
                        {t('videoConsult.tokenSystem.yourTurn')}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-yellow-600">
                    {t('videoConsult.tokenSystem.tokenNotification')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">{t('videoConsult.howToUse')}</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              {isInstantConsultation ? (
                <>
                  <li>{t('videoConsult.clickJoinVideoCall')}</li>
                  <li>{t('videoConsult.shareMeetingLink')}</li>
                  <li>{t('videoConsult.yourDoctorCanJoin')}</li>
                  <li className="font-medium">{t('videoConsult.noBookingRequired')}</li>
                </>
              ) : (
                <>
                  <li>{t('videoConsult.clickStartVideoCall')}</li>
                  <li>{t('videoConsult.shareMeetingLink')}</li>
                  <li>{t('videoConsult.bothYouAndDoctor')}</li>
                </>
              )}
            </ul>
          </div>

          {/* Live Video Call */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-3">
              {isInstantConsultation ? t('videoConsult.startInstantConsultation') : t('videoConsult.liveVideoConsultation')}
            </h2>
            {room ? (
              <div className="space-y-4">
                {(!doctorBusy || (tokenInfo && queuePosition === 0)) ? (
                  <button
                    onClick={startVideoCall}
                    className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium text-lg shadow-lg"
                  >
                    {isInstantConsultation ? t('videoConsult.joinVideoCall') : t('videoConsult.startVideoCall')}
                  </button>
                ) : (
                  <div className="p-3 bg-gray-100 rounded border text-gray-600">
                    {tokenInfo ? t('videoConsult.tokenSystem.pleaseWait') : t('videoConsult.tokenSystem.joinQueue')}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-gray-600">{t('videoConsult.creatingMeetingRoom')}</div>
              </div>
            )}
          </div>

          {room && (
            (() => {
              const shareLink = `https://meet.jit.si/${room}`
              return (
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="font-semibold mb-2">{t('videoConsult.shareMeetingLinkLabel')}</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isInstantConsultation ? t('videoConsult.shareWithDoctor') : t('videoConsult.shareWithDoctorJitsi')}
                      </label>
                      <div className="flex gap-2 items-center">
                        <input readOnly value={shareLink} className="flex-1 border rounded px-2 py-1 text-sm" />
                        <button 
                          onClick={() => copyToClipboard(shareLink)} 
                          className="px-3 py-1 rounded bg-primary text-white text-sm hover:bg-primary-dark transition-colors"
                        >
                          {t('videoConsult.copy')}
                        </button>
                      </div>
                      {isInstantConsultation && (
                        <p className="mt-2 text-sm text-blue-600">
                          {t('videoConsult.yourDoctorCanJoinDirectly')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()
          )}

          {/* Chat Section */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-3">{t('videoConsult.chat')}</h2>
            <div className="border rounded p-3 h-40 overflow-y-auto text-sm text-gray-600 mb-3 bg-gray-50">
              <div className="mb-2">
                <span className="font-medium text-blue-600">{t('videoConsult.doctor')}:</span> {t('videoConsult.howAreYouFeeling')}
              </div>
              <div className="mb-2">
                <span className="font-medium text-green-600">{t('videoConsult.patient')}:</span> {t('videoConsult.feelingBetter')}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('videoConsult.typeYourMessage')}
                className="flex-1 border rounded px-3 py-2"
              />
              <button className="px-4 py-2 rounded bg-primary text-white hover:bg-primary-dark transition-colors">
                {t('videoConsult.send')}
              </button>
            </div>
          </div>

          {/* Consultation Info */}
          {!isInstantConsultation && consultation && (
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-3">{t('videoConsult.consultationDetails')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">{t('videoConsult.doctor')}:</span> {consultation.doctor_name || t('videoConsult.notAssigned')}
                </div>
                <div>
                  <span className="font-medium">{t('videoConsult.date')}:</span> {consultation.date || t('videoConsult.notScheduled')}
                </div>
                <div>
                  <span className="font-medium">{t('videoConsult.status')}:</span> {consultation.status || t('videoConsult.pending')}
                </div>
                <div>
                  <span className="font-medium">{t('videoConsult.notes')}:</span> {consultation.notes || t('videoConsult.noNotes')}
                </div>
              </div>
            </div>
          )}
      </div>
    </AppShell>
  )
}
