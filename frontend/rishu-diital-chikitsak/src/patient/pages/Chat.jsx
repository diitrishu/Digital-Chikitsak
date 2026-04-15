/**
 * Patient Chat Page — /patient/chat/:doctorId
 * Patient describes their problem, doctor replies
 */
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Stethoscope } from 'lucide-react'
import AppShell from '../components/AppShell'
import ConsultationChat from '../../shared/components/ConsultationChat'
import { supabase } from '../../shared/services/supabase'

export default function PatientChat() {
  const { doctorId } = useParams()
  const navigate = useNavigate()
  const [patientInfo, setPatientInfo] = useState(null)
  const [doctorInfo, setDoctorInfo] = useState(null)
  const [tokenId, setTokenId] = useState(null)

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()

  useEffect(() => {
    async function load() {
      // Get patient info
      const { data: patient } = await supabase
        .from('patients').select('id, name').eq('phone', user.phone).maybeSingle()
      if (patient) setPatientInfo(patient)

      // Get doctor info
      if (doctorId) {
        const { data: doctor } = await supabase
          .from('doctors').select('id, name, specialization').eq('id', doctorId).single()
        if (doctor) setDoctorInfo(doctor)

        // Find active token for this patient+doctor
        if (patient) {
          const { data: token } = await supabase
            .from('tokens')
            .select('id')
            .eq('patient_id', patient.id)
            .eq('doctor_id', doctorId)
            .in('status', ['waiting', 'in_consultation'])
            .maybeSingle()
          if (token) setTokenId(token.id)
        }
      }
    }
    load()
  }, [doctorId, user.phone])

  if (!patientInfo || !doctorInfo) {
    return (
      <AppShell title="Chat">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="">
      <div className="flex flex-col h-[calc(100vh-56px)]">
        {/* Doctor header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Stethoscope size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{doctorInfo.name}</p>
            <p className="text-xs text-gray-400 capitalize">{doctorInfo.specialization}</p>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <ConsultationChat
            patientId={patientInfo.id}
            doctorId={doctorInfo.id}
            tokenId={tokenId}
            senderRole="patient"
            senderName={patientInfo.name || user.name}
          />
        </div>
      </div>
    </AppShell>
  )
}
