/**
 * Doctor Chat Page — /doctor/chat/:patientId
 * Doctor sees patient's problem and replies with solution
 */
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User } from 'lucide-react'
import DoctorShell from '../components/DoctorShell'
import ConsultationChat from '../../shared/components/ConsultationChat'
import { supabase } from '../../shared/services/supabase'

export default function DoctorChat() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const [doctorInfo, setDoctorInfo] = useState(null)
  const [patientInfo, setPatientInfo] = useState(null)
  const [tokenId, setTokenId] = useState(null)

  const doctorId = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}').supabase_doctor_id } catch { return null }
  })()

  useEffect(() => {
    async function load() {
      if (!doctorId || !patientId) return

      const [{ data: doctor }, { data: patient }] = await Promise.all([
        supabase.from('doctors').select('id, name, specialization').eq('id', doctorId).single(),
        supabase.from('patients').select('id, name, age, phone').eq('id', patientId).single(),
      ])
      if (doctor) setDoctorInfo(doctor)
      if (patient) setPatientInfo(patient)

      // Find active token
      const { data: token } = await supabase
        .from('tokens')
        .select('id')
        .eq('patient_id', patientId)
        .eq('doctor_id', doctorId)
        .in('status', ['waiting', 'in_consultation'])
        .maybeSingle()
      if (token) setTokenId(token.id)
    }
    load()
  }, [doctorId, patientId])

  if (!doctorInfo || !patientInfo) {
    return (
      <DoctorShell title="Chat">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </DoctorShell>
    )
  }

  return (
    <DoctorShell title="">
      <div className="flex flex-col h-[calc(100vh-56px)]">
        {/* Patient header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
            <User size={20} className="text-teal-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{patientInfo.name}</p>
            <p className="text-xs text-gray-400">
              {patientInfo.age ? `${patientInfo.age} years · ` : ''}{patientInfo.phone}
            </p>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <ConsultationChat
            patientId={patientInfo.id}
            doctorId={doctorInfo.id}
            tokenId={tokenId}
            senderRole="doctor"
            senderName={`Dr. ${doctorInfo.name}`}
          />
        </div>
      </div>
    </DoctorShell>
  )
}
