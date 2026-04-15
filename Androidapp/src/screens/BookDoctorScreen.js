import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from 'src/services/supabase';
import { useAuthStore } from 'src/store/useAuthStore';
import { generateToken } from 'src/services/queueService';
import Toast from 'react-native-toast-message';
import { speak } from 'src/services/voiceService';

const SPEC_LABELS = {
  general: 'General Physician', respiratory: 'Respiratory Specialist',
  gastroenterology: 'Gastroenterologist', orthopedics: 'Orthopedic',
  dermatology: 'Skin Specialist', cardiology: 'Heart Specialist',
  pediatrics: 'Child Specialist', geriatrics: 'Senior Specialist',
};

export default function BookDoctorScreen({ navigation }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const user = useAuthStore((s) => s.user);

  const fetchDoctors = async () => {
    const { data } = await supabase
      .from('doctors')
      .select('*')
      .order('status', { ascending: false });
    setDoctors(data || []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchDoctors(); }, []);

  const handleBook = async (doctor) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBookingId(doctor.id);
    try {
      // Get patient id from supabase
      const { data: pat } = await supabase
        .from('patients').select('id').eq('phone', user.phone).maybeSingle();
      if (!pat) throw new Error('Patient profile not found');

      const token = await generateToken({
        patientId: pat.id, priority: 'general',
        specialization: doctor.specialization, symptomsSummary: 'Direct booking',
        doctorIdOverride: doctor.id,
      });
      speak(`Doctor ${doctor.name} ke saath queue mein aa gaye. Token number ${token.token_number} hai.`);
      Toast.show({ type: 'success', text1: `Token #${token.token_number} mila!`, text2: `Dr. ${doctor.name} ke queue mein hain` });
      navigation.navigate('SymptomChecker');
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Booking nahi hui', text2: err.message });
    } finally {
      setBookingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0d9488" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doctor Dhundho 👨‍⚕️</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDoctors(); }} />}
      >
        {loading ? (
          <Text style={styles.loadingText}>Doctor dhundh rahe hain…</Text>
        ) : doctors.length === 0 ? (
          <Text style={styles.emptyText}>Koi doctor available nahi hai abhi</Text>
        ) : (
          doctors.map((doc) => (
            <View key={doc.id} style={styles.card}>
              {/* Status badge */}
              <View style={[styles.statusBadge, { backgroundColor: doc.status === 'online' ? '#dcfce7' : '#f3f4f6' }]}>
                <View style={[styles.statusDot, { backgroundColor: doc.status === 'online' ? '#22c55e' : '#9ca3af' }]} />
                <Text style={[styles.statusText, { color: doc.status === 'online' ? '#15803d' : '#6b7280' }]}>
                  {doc.status === 'online' ? 'Online' : doc.status === 'in_call' ? 'Call mein' : 'Offline'}
                </Text>
              </View>

              <View style={styles.docInfo}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={36} color="#0d9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>Dr. {doc.name}</Text>
                  <Text style={styles.docSpec}>{SPEC_LABELS[doc.specialization] || doc.specialization}</Text>
                  {doc.experience && <Text style={styles.docDetail}>⏱ {doc.experience} saal ka anubhav</Text>}
                  <Text style={styles.docDetail}>⌚ ~{doc.avg_consult_time || 10} min per patient</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.bookBtn, doc.status === 'offline' && styles.bookBtnDisabled]}
                onPress={() => handleBook(doc)}
                disabled={doc.status === 'offline' || bookingId === doc.id}
              >
                <Ionicons name={doc.status === 'online' ? 'call' : 'time'} size={22} color="white" />
                <Text style={styles.bookBtnText}>
                  {bookingId === doc.id ? 'Booking ho rahi hai…' :
                    doc.status === 'online' ? 'Queue Mein Jao' :
                      doc.status === 'in_call' ? 'Baad Mein Aao' : 'Abhi Nahi Hain'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  loadingText: { textAlign: 'center', color: '#6b7280', fontSize: 18, marginTop: 60 },
  emptyText: { textAlign: 'center', color: '#9ca3af', fontSize: 18, marginTop: 60 },
  card: {
    backgroundColor: 'white', margin: 12, marginBottom: 4,
    borderRadius: 20, padding: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginBottom: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  docInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#f0fdfa', alignItems: 'center', justifyContent: 'center',
  },
  docName: { fontSize: 20, fontWeight: '800', color: '#1f2937' },
  docSpec: { fontSize: 15, color: '#0d9488', fontWeight: '600', marginTop: 2 },
  docDetail: { fontSize: 14, color: '#6b7280', marginTop: 3 },
  bookBtn: {
    backgroundColor: '#0d9488', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14,
  },
  bookBtnDisabled: { backgroundColor: '#d1d5db' },
  bookBtnText: { color: 'white', fontWeight: '700', fontSize: 18 },
});
