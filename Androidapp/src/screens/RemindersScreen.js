import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import api from 'src/services/api';
import LoadingSpinner from 'src/components/LoadingSpinner';
import { scheduleMedicationReminder, cancelReminder, requestNotificationPermission } from 'src/services/notificationService';
import { speak } from 'src/services/voiceService';

export default function RemindersScreen() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newMed, setNewMed] = useState('');
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    async function init() {
      await requestNotificationPermission();
      try { const d = await api.getReminders(); setReminders(d.reminders || d || []); } catch {}
      setLoading(false);
    }
    init();
  }, []);

  const addReminder = async () => {
    if (!newMed.trim() || !newTime.trim()) {
      Alert.alert('Zaroori Janakari', 'Kripya dawai ka naam aur samay (jaise 08:00) dono likhein.');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const rId = new Date().getTime().toString();
    const newEntry = { id: rId, medicine: newMed, time: newTime, active: true };

    try {
      const r = await api.createReminder(newEntry);
      setReminders(prev => [...prev, r.reminder || newEntry]);
    } catch {
      // Offline fallback
      setReminders(prev => [...prev, newEntry]);
    }

    // Schedule the push notification
    await scheduleMedicationReminder({ id: rId, medicineName: newMed, time: newTime });
    speak(`Dawai ${newMed} ka reminder ${newTime} baje ke liye set ho gaya hai.`);

    setNewMed(''); setNewTime(''); setShowAdd(false);
    Toast.show({ type: 'success', text1: 'Reminder set ho gaya!' });
  };

  const deleteReminder = (idx, id) => {
    Alert.alert('Dawai Hatayein?', 'Kya aap is dawai ka reminder hatana chahte hain?', [
      { text: 'Nahi', style: 'cancel' },
      { text: 'Hata De', style: 'destructive', onPress: async () => {
          await cancelReminder(id?.toString() || idx.toString());
          setReminders(prev => prev.filter((_, i) => i !== idx));
          speak('Reminder hata diya gaya hai.');
        } 
      },
    ]);
  };

  if (loading) return <LoadingSpinner message="Dawai ki list aa rahi hai..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Dawai Yaad 💊</Text>
            <Text style={styles.headerSub}>Roz ki dawai ka routine</Text>
          </View>
          <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={[styles.addBtn, showAdd && styles.addBtnActive]}>
            <Ionicons name={showAdd ? 'close' : 'add'} size={32} color="white" />
          </TouchableOpacity>
        </View>

        {/* Add Form */}
        {showAdd && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Nayi Dawai Set Karein</Text>
            
            <Text style={styles.inputLabel}>Dawai ka naam:</Text>
            <TextInput 
              value={newMed} onChangeText={setNewMed} 
              placeholder="Jaise: Paracetamol" placeholderTextColor="#9ca3af"
              style={styles.input} 
            />
            
            <Text style={styles.inputLabel}>Samay (Baje):</Text>
            <TextInput 
              value={newTime} onChangeText={setNewTime} 
              placeholder="Jaise: 08:30" placeholderTextColor="#9ca3af"
              keyboardType="numbers-and-punctuation"
              style={styles.input} 
            />
            
            <TouchableOpacity onPress={addReminder} style={styles.submitBtn}>
              <Ionicons name="notifications" size={24} color="white" />
              <Text style={styles.submitText}>Alarm Set Karein</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* List */}
        {reminders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="medical" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>Koi dawai set nahi hai</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowAdd(true)}>
              <Text style={styles.emptyAddText}>Pehli Dawai Jodein</Text>
            </TouchableOpacity>
          </View>
        ) : (
          reminders.map((r, i) => (
            <View key={r.id || i} style={styles.reminderCard}>
              <View style={styles.iconBox}>
                <Ionicons name="alarm" size={28} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.medName}>{r.medicine}</Text>
                <Text style={styles.medTime}>Roz, {r.time} baje</Text>
              </View>
              <TouchableOpacity style={styles.delBtn} onPress={() => deleteReminder(i, r.id)}>
                <Ionicons name="trash" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#1f2937' },
  headerSub: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  
  addBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  addBtnActive: { backgroundColor: '#ef4444' },
  
  formCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 20, elevation: 2 },
  formTitle: { fontSize: 18, fontWeight: '800', color: '#374151', marginBottom: 16 },
  inputLabel: { fontSize: 16, fontWeight: '700', color: '#6b7280', marginBottom: 6 },
  input: {
    borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, marginBottom: 16, backgroundColor: '#f9fafb',
  },
  submitBtn: {
    backgroundColor: '#0d9488', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 16, marginTop: 8,
  },
  submitText: { color: 'white', fontWeight: '800', fontSize: 18 },
  
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, marginTop: 20 },
  emptyText: { fontSize: 18, color: '#9ca3af', marginTop: 12, marginBottom: 24, fontWeight: '600' },
  emptyAddBtn: { backgroundColor: '#fef3c7', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 20 },
  emptyAddText: { color: '#d97706', fontSize: 18, fontWeight: '800' },
  
  reminderCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 16, elevation: 1,
  },
  iconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  medName: { fontSize: 20, fontWeight: '800', color: '#1f2937' },
  medTime: { fontSize: 16, color: '#d97706', fontWeight: '700', marginTop: 4 },
  delBtn: { padding: 12, backgroundColor: '#fef2f2', borderRadius: 12 },
});
