import * as Location from 'expo-location';
import { Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Speech from 'expo-speech';
import * as SMS from 'expo-sms';

export async function getEmergencyContact() {
  try {
    const contact = await SecureStore.getItemAsync('dc_emergency_contact');
    return contact || '112';
  } catch {
    return '112';
  }
}

export async function setEmergencyContact(number) {
  await SecureStore.setItemAsync('dc_emergency_contact', number);
}

export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return location.coords;
  } catch {
    return null;
  }
}

// Send SMS to emergency contact
export async function sendEmergencySMS(latitude, longitude) {
  const isAvailable = await SMS.isAvailableAsync();
  if (!isAvailable) {
    console.warn('SMS not available on this device');
    return;
  }

  const emergencyContact = await SecureStore.getItemAsync('dc_emergency_contact');
  if (!emergencyContact || emergencyContact === '112') {
    console.warn('No personal emergency contact saved');
    return;
  }

  const patientName = await SecureStore.getItemAsync('dc_patient_name') || 'Patient';
  const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
  const message = `EMERGENCY ALERT: ${patientName} needs immediate help. Location: ${mapsUrl}`;

  await SMS.sendSMSAsync([emergencyContact], message);
}

export async function triggerSOS(patientName = 'Patient') {
  // Speak the alert
  Speech.speak('Emergency! Call ho raha hai! Cancel ke liye screen touch karein.', {
    language: 'hi-IN',
    rate: 0.9,
  });

  // Dial 112
  const contact = await getEmergencyContact();
  Linking.openURL(`tel:${contact}`);

  // Send SMS to personal contact
  const coords = await getCurrentLocation();
  if (coords) {
    sendEmergencySMS(coords.latitude, coords.longitude);
  }
}
