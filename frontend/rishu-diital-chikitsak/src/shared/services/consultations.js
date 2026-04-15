import api from './api'

export async function listConsultations() {
  try {
    const { data } = await api.get('/consultations')
    return data
  } catch (error) {
    console.error('Error fetching consultations:', error)
    throw new Error('Failed to fetch consultations')
  }
}

export async function getConsultation(consultationId) {
  try {
    const { data } = await api.get(`/consultations/${consultationId}`)
    return data
  } catch (error) {
    console.error('Error fetching consultation:', error)
    throw new Error('Failed to fetch consultation details')
  }
}

export async function createConsultation({ patient_id, doctor_id, symptoms }) {
  try {
    const { data } = await api.post('/consultations', { patient_id, doctor_id, symptoms })
    return data
  } catch (error) {
    console.error('Error creating consultation:', error)
    throw new Error('Failed to create consultation')
  }
}