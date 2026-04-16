import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../../shared/components/Header'
import DoctorSidebar from '../components/DoctorSidebar'
import BackButton from '../../shared/components/BackButton'
import { getConsultation } from '../../shared/services/consultations'
import { getCurrentUser } from '../../shared/services/auth'
import VideoConsultation from '../../shared/components/VideoConsultation'

export default function DoctorConsultation() {
  const { id } = useParams() // consultation id
  const [consultation, setConsultation] = useState(null)
  const [patient, setPatient] = useState(null)
  const [showVideoCall, setShowVideoCall] = useState(false)

  useEffect(() => {
    (async () => {
      if (!id) return
      const data = await getConsultation(id)
      setConsultation(data)
    })()
  }, [id])

  const startVideoCall = () => {
    setShowVideoCall(true)
  }

  const endVideoCall = () => {
    setShowVideoCall(false)
  }

  if (!consultation) return <div>Loading...</div>

  // If we're in video call mode, show the video consultation component
  if (showVideoCall && consultation?.meeting_link) {
    const user = getCurrentUser()
    const displayName = user?.name || user?.phone || 'Doctor'
    const room = (consultation.meeting_link || '').split('/').pop()
    
    return (
      <VideoConsultation 
        roomName={room}
        displayName={displayName}
        onEndCall={endVideoCall}
        consultationId={id}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <DoctorSidebar />
        <main className="flex-1 p-6 space-y-6">
          <BackButton />

          <h1 className="text-2xl font-semibold mb-4">Consultation with Patient</h1>

          {/* Patient Info */}
          {patient && (
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold">Patient Info</h2>
              <p className="text-sm text-gray-600">
                <span className="font-medium">{patient.name}</span> ({patient.relation})
              </p>
              <p className="text-sm text-gray-500">
                {patient.age ? `${patient.age} yrs` : 'Age not set'} • {patient.gender || 'Gender not set'}
              </p>
              <p className="text-sm text-gray-500">Blood Group: {patient.blood_group || 'N/A'}</p>
            </div>
          )}

          {/* Video Call Section */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-3">Live Video Consultation</h2>
            {consultation?.meeting_link ? (
              <div className="space-y-4">
                <button
                  onClick={startVideoCall}
                  className="px-4 py-2 rounded bg-primary text-white hover:bg-primary-dark transition-colors"
                >
                  Join Video Call
                </button>
              </div>
            ) : (
              <div className="w-full aspect-video bg-black rounded flex items-center justify-center text-white">
                <p>No meeting link available</p>
              </div>
            )}
          </div>

          {/* Symptoms + Prescription */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold">Consultation Details</h2>
            <p><span className="font-medium">Symptoms:</span> {consultation.symptoms}</p>

            <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
              Prescription
            </label>
            <textarea
              placeholder="Write prescription..."
              value={consultation.prescription}
              onChange={(e) => setConsultation({ ...consultation, prescription: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-primary/60"
            />
            <button className="mt-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">
              Save Prescription
            </button>
          </div>

          {/* Chat Section */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-3">Chat with Patient</h2>
            <div className="border rounded p-3 h-40 overflow-y-auto text-sm text-gray-600 mb-3">
              <p><span className="font-medium">Patient:</span> Feeling weak.</p>
              <p><span className="font-medium">Doctor:</span> Please keep hydrated and take rest.</p>
            </div>
            <input
              type="text"
              placeholder="Type your message..."
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </main>
      </div>
    </div>
  )
}
