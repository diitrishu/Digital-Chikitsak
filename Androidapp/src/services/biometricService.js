import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export async function isBiometricAvailable() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function getBiometricType() {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  return 'unknown';
}

export async function authenticateWithBiometric() {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Apni ungli rakhein ya chehra dikhayein',
    fallbackLabel: 'PIN use karein',
    cancelLabel: 'Wapis jao',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function enableBiometric() {
  await SecureStore.setItemAsync('biometric_enabled', 'true');
}

export async function disableBiometric() {
  await SecureStore.deleteItemAsync('biometric_enabled');
}

export async function isBiometricEnabled() {
  const val = await SecureStore.getItemAsync('biometric_enabled');
  return val === 'true';
}
