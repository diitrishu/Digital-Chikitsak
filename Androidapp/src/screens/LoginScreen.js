import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import FormInput from 'src/components/FormInput';
import { useAuthStore } from 'src/store/useAuthStore';
import * as Haptics from 'expo-haptics';
import { isBiometricEnabled, authenticateWithBiometric } from 'src/services/biometricService';
import * as SecureStore from 'expo-secure-store';
const loginSchema = z.object({
  phone: z.string().min(10, '10 anko ka number dalein').max(10, 'Sirf 10 ank hone chahiye'),
  pin: z.string().min(4, 'Kam se kam 4 anko ka PIN dalein'),
});

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const login = useAuthStore((s) => s.login);

  const { control, handleSubmit, setValue } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', pin: '' },
  });

  useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const enabled = await isBiometricEnabled();
    const savedPhone = await SecureStore.getItemAsync('dc_user_phone');
    const savedPin = await SecureStore.getItemAsync('dc_user_pin');
    
    if (enabled && savedPhone && savedPin) {
      setBioAvailable(true);
      setValue('phone', savedPhone);
      // Automatically prompt biometric if it's their app
      handleBiometricLogin(savedPhone, savedPin);
    }
  };

  const handleBiometricLogin = async (phone, pin) => {
    const success = await authenticateWithBiometric();
    if (success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSubmit({ phone, pin });
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data);
      // Save for subsequent biometric logins
      await SecureStore.setItemAsync('dc_user_phone', data.phone);
      await SecureStore.setItemAsync('dc_user_pin', data.pin);
      
      Toast.show({ type: 'success', text1: 'Aapka swagat hai!' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Login nahi ho paya', text2: err?.response?.data?.error || 'Number ya PIN galat hai' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="medical" size={64} color="#0d9488" />
          </View>
          <Text style={styles.title}>Digital Chikitsak</Text>
          <Text style={styles.subtitle}>Aapki Sehat, Hamari Zimmedari</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>App Mein Aaiye</Text>
          
          <View style={styles.inputWrap}>
            <FormInput control={control} name="phone" label="Phone Number" placeholder="Aapka 10 anko ka number" keyboardType="phone-pad" maxLength={10} style={{fontSize: 20}} />
          </View>
          
          <View style={styles.inputWrap}>
            <FormInput control={control} name="pin" label="PIN Number" placeholder="Kufiya 4 anko ka PIN" secureTextEntry keyboardType="number-pad" style={{fontSize: 20}} />
          </View>

          {bioAvailable && (
            <TouchableOpacity 
              style={styles.bioBtn}
              onPress={async () => {
                const phone = await SecureStore.getItemAsync('dc_user_phone');
                const pin = await SecureStore.getItemAsync('dc_user_pin');
                if (phone && pin) handleBiometricLogin(phone, pin);
              }}
            >
              <Ionicons name="finger-print" size={36} color="#0d9488" />
              <Text style={styles.bioText}>Fingerprint se kholen</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              handleSubmit(onSubmit)();
            }}
            disabled={loading}
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
          >
            {loading ? (
              <Text style={styles.loginBtnText}>Khul raha hai...</Text>
            ) : (
              <Text style={styles.loginBtnText}>LOGIN KAREIN</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
            <Text style={styles.registerText}>
              Naya account banana hai? <Text style={styles.registerHighlight}>Yahan dabayein</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { 
    backgroundColor: '#0d9488', paddingTop: 60, paddingBottom: 40, px: 24, 
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32, alignItems: 'center' 
  },
  iconCircle: {
    width: 100, height: 100, backgroundColor: 'white', borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10,
  },
  title: { fontSize: 32, fontWeight: '900', color: 'white' },
  subtitle: { fontSize: 16, color: '#ccfbf1', marginTop: 8 },
  
  formContainer: { paddingHorizontal: 24, paddingTop: 40, flex: 1 },
  welcomeText: { fontSize: 24, fontWeight: '800', color: '#1f2937', marginBottom: 24 },
  
  inputWrap: { marginBottom: 16 },
  
  bioBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#f0fdfa', borderWidth: 2, borderColor: '#0d9488',
    paddingVertical: 16, borderRadius: 20, marginBottom: 20,
  },
  bioText: { fontSize: 18, fontWeight: '700', color: '#0d9488' },
  
  loginBtn: {
    backgroundColor: '#0d9488', paddingVertical: 20, borderRadius: 20, alignItems: 'center',
    marginBottom: 24, elevation: 4, shadowColor: '#0d9488', shadowOpacity: 0.3, shadowRadius: 8,
  },
  loginBtnText: { color: 'white', fontWeight: '900', fontSize: 20, letterSpacing: 1 },
  
  registerLink: { alignItems: 'center', paddingVertical: 16 },
  registerText: { fontSize: 18, color: '#6b7280' },
  registerHighlight: { color: '#0d9488', fontWeight: '700' },
});

