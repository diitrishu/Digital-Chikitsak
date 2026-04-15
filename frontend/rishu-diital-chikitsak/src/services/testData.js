// Test data service for creating sample consultations for testing
import { createConsultation } from '../shared/services/consultations';
import { getCurrentUser } from '../shared/services/auth';

/**
 * Create a test consultation for testing the video consultation feature
 * @returns {Promise<Object>} The created consultation object
 */
export async function createTestConsultation() {
  try {
    // Get current user
    const user = getCurrentUser();
    
    if (!user) {
      throw new Error('No user logged in');
    }
    
    // Use user's phone as patient_id for testing
    const patientId = user.phone || 'test-patient-id';
    
    // Create consultation with mock data
    const consultationData = {
      patient_id: patientId,
      doctor_id: 'test-doctor-id',
      symptoms: 'Test consultation for video call feature'
    };
    
    const consultation = await createConsultation(consultationData);
    return consultation;
  } catch (error) {
    console.error('Error creating test consultation:', error);
    throw error;
  }
}