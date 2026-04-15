import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import FormInput from 'src/components/FormInput';
import { useAuthStore } from 'src/store/useAuthStore';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Enter a valid 10-digit phone number').max(10),
  pin: z.string().min(4, 'PIN must be at least 4 characters'),
  age: z.string().min(1, 'Age is required'),
});

export default function RegisterScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);

  const { control, handleSubmit } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', phone: '', pin: '', age: '' },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await register({ ...data, age: parseInt(data.age), role: 'patient' });
      Toast.show({ type: 'success', text1: 'Account ban gaya!', text2: 'Aapka swagat hai 🎉' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Registration nahi ho paya', text2: err?.response?.data?.error || 'Dobara try karein' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-add" size={48} color="#0d9488" />
          </View>
          <Text style={styles.headerTitle}>Naya Account</Text>
          <Text style={styles.headerSubtitle}>Digital Chikitsak mein shamil ho</Text>
        </View>

        <View style={styles.form}>
          <FormInput control={control} name="name" label="Pura Naam" placeholder="Aapka naam" />
          <FormInput control={control} name="phone" label="Phone Number" placeholder="10 anko ka number" keyboardType="phone-pad" maxLength={10} />
          <FormInput control={control} name="age" label="Aayu (Age)" placeholder="Aapki aayu" keyboardType="numeric" maxLength={3} />
          <FormInput control={control} name="pin" label="PIN banayein" placeholder="Kam se kam 4 ank" secureTextEntry keyboardType="number-pad" />

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            style={[styles.registerBtn, loading && { opacity: 0.6 }]}
          >
            <Text style={styles.registerBtnText}>{loading ? 'Banaya ja raha hai...' : 'REGISTER KAREIN'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>
              Pehle se account hai? <Text style={styles.loginHighlight}>Login karein</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  header: {
    backgroundColor: '#0d9488', paddingTop: 60, paddingBottom: 40,
    paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    alignItems: 'center',
  },
  iconCircle: {
    width: 90, height: 90, backgroundColor: '#fff', borderRadius: 45,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff' },
  headerSubtitle: { fontSize: 15, color: '#ccfbf1', marginTop: 6 },
  form: { paddingHorizontal: 24, paddingTop: 32, flex: 1 },
  registerBtn: {
    backgroundColor: '#0d9488', paddingVertical: 20, borderRadius: 20,
    alignItems: 'center', marginTop: 20, marginBottom: 24,
    elevation: 4, shadowColor: '#0d9488', shadowOpacity: 0.3, shadowRadius: 8,
  },
  registerBtnText: { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  loginLink: { alignItems: 'center', paddingVertical: 16 },
  loginLinkText: { fontSize: 16, color: '#6b7280' },
  loginHighlight: { color: '#0d9488', fontWeight: '700' },
});
