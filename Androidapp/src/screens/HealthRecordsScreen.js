import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { uploadHealthRecord } from 'src/services/cloudinary';
import { supabase } from 'src/services/supabase';
import { useAuthStore } from 'src/store/useAuthStore';
import api from 'src/services/api';
import LoadingSpinner from 'src/components/LoadingSpinner';
import * as Linking from 'expo-linking';
import { exportHealthReport } from 'src/services/exportService';

function getFileIcon(type) {
  switch (type) {
    case 'xray': return '📷';
    case 'prescription': return '💊';
    default: return '📄';
  }
}

export default function HealthRecordsScreen() {
  const user = useAuthStore((s) => s.user);
  const [records, setRecords] = useState([]);
  const [medications, setMedications] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState(null);

  useEffect(() => {
    async function load() {
      if (!user?.phone) return;
      const { data: patient } = await supabase.from('patients').select('id').eq('phone', user.phone).maybeSingle();
      if (patient) setPatientId(patient.id);
      
      try {
        const [recs, meds] = await Promise.all([
          api.getRecords(),
          api.getReminders() // for the PDF export
        ]);
        setRecords(recs.records || []);
        setMedications(meds.reminders || meds || []);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const pickAndUpload = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
      if (result.canceled) return;
      const file = result.assets[0];
      setUploading(true);

      const cloudResult = await uploadHealthRecord(file.uri, patientId);
      const newRecord = {
        title: file.name || 'Nayi Report',
        file_name: file.name,
        file_url: cloudResult.secure_url,
        public_id: cloudResult.public_id,
        record_type: 'report',
        record_date: new Date().toISOString(),
      };
      setRecords(prev => [newRecord, ...prev]);
      Toast.show({ type: 'success', text1: 'Report save ho gayi!' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Upload nahi hua', text2: 'Internet check karein' });
    } finally {
      setUploading(false);
    }
  };

  const handleExport = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await exportHealthReport({ 
        patient: user, 
        records: records, 
        medications: medications 
      });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'PDF nahi ban paya', text2: err.message });
    }
  };

  if (loading) return <LoadingSpinner message="Aapki reports aa rahi hain..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        <Text style={styles.headerTitle}>Meri Report 📄</Text>
        <Text style={styles.headerSub}>Aapke saare test aur parche yahan hain</Text>

        {/* Actions Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            onPress={pickAndUpload} disabled={uploading}
            style={[styles.actionBtn, { backgroundColor: '#f0fdfa', borderColor: '#ccfbf1' }, uploading && { opacity: 0.5 }]}
          >
            <View style={[styles.actionIconCell, { backgroundColor: '#ccfbf1' }]}>
              <Ionicons name={uploading ? "sync" : "cloud-upload"} size={28} color="#0d9488" />
            </View>
            <Text style={[styles.actionText, { color: '#0f766e' }]}>{uploading ? 'Dal raha...' : 'Nayi Upload'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleExport} style={[styles.actionBtn, { backgroundColor: '#ecfeff', borderColor: '#cffafe' }]}>
            <View style={[styles.actionIconCell, { backgroundColor: '#cffafe' }]}>
              <Ionicons name="document-text" size={28} color="#0891b2" />
            </View>
            <Text style={[styles.actionText, { color: '#164e63' }]}>PDF Download</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Pichli Reports</Text>

        {/* Records list */}
        {records.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="folder-open" size={64} color="#e5e7eb" />
            <Text style={styles.emptyText}>Koi report nahi hai</Text>
          </View>
        ) : (
          records.map((r, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => r.file_url && Linking.openURL(r.file_url)}
              style={styles.recordCard}
            >
              <Text style={styles.recordIcon}>{getFileIcon(r.record_type)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.recordTitle} numberOfLines={1}>{r.title || r.file_name}</Text>
                <Text style={styles.recordDate}>{r.record_date ? new Date(r.record_date).toLocaleDateString('hi-IN') : 'Puraani'}</Text>
              </View>
              <View style={styles.viewBtn}>
                <Text style={styles.viewBtnText}>Dekhein</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#1f2937' },
  headerSub: { fontSize: 16, color: '#6b7280', marginTop: 4, marginBottom: 20 },
  
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  actionBtn: { 
    flex: 1, borderWidth: 2, borderRadius: 20, padding: 16, 
    alignItems: 'center', gap: 10, elevation: 1 
  },
  actionIconCell: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 16, fontWeight: '800' },
  
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#374151', marginBottom: 12, marginLeft: 4 },
  
  emptyBox: { alignItems: 'center', paddingVertical: 40, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 20, marginTop: 10 },
  emptyText: { fontSize: 18, color: '#9ca3af', fontWeight: '600', marginTop: 12 },
  
  recordCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 16, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
  },
  recordIcon: { fontSize: 32 },
  recordTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  recordDate: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  viewBtn: { backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  viewBtnText: { fontSize: 14, fontWeight: '700', color: '#4b5563' },
});
