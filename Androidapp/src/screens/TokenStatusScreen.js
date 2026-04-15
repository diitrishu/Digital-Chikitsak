import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl, Animated, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueue } from 'src/hooks/useQueue';
import { speak } from 'src/services/voiceService';

const PRIORITY_CONFIG = {
  emergency: { label: '🚨 Emergency', color: '#ef4444', bg: '#fef2f2' },
  senior: { label: '👴 Senior', color: '#f97316', bg: '#fff7ed' },
  child: { label: '👦 Bachha', color: '#3b82f6', bg: '#eff6ff' },
  general: { label: '✅ General', color: '#22c55e', bg: '#f0fdf4' },
};

export default function TokenStatusScreen({ navigation, route }) {
  const token = route?.params?.token;
  const queueHook = useQueue(token?.doctor_id, token?.id, token?.token_number);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pc = PRIORITY_CONFIG[token?.priority] || PRIORITY_CONFIG.general;

  useEffect(() => {
    if (!token) return;
    // Pulse animation on the big number
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    // Speak status
    if (queueHook.myPosition !== null) {
      speak(`Aapka token number ${token.token_number} hai. Aapke aage ${queueHook.myPosition - 1} log hain.`);
    }
  }, [token, queueHook.myPosition]);

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0d9488" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Token Status</Text>
        </View>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🎫</Text>
          <Text style={styles.emptyTitle}>Koi Token Nahi</Text>
          <Text style={styles.emptySubtitle}>Pehle symptom checker se queue mein join karein</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('SymptomChecker')}>
            <Text style={styles.actionBtnText}>Queue Mein Jaiye</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={false} onRefresh={queueHook.refresh} />}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0d9488" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aapka Token 🎫</Text>
        </View>

        {/* Big token number */}
        <View style={[styles.tokenCard, { backgroundColor: queueHook.isMyTurn ? '#0d9488' : '#1f2937' }]}>
          <Text style={styles.tokenLabel}>AAPKA NUMBER</Text>
          <Animated.Text style={[styles.tokenNumber, { transform: [{ scale: pulseAnim }] }]}>
            {token.token_number}
          </Animated.Text>
          <View style={[styles.priorityChip, { backgroundColor: pc.bg }]}>
            <Text style={[styles.priorityText, { color: pc.color }]}>{pc.label}</Text>
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusCard}>
          {queueHook.isMyTurn ? (
            <>
              <Text style={styles.turnTitle}>🎉 Aapki Baari Aa Gayi!</Text>
              <Text style={styles.turnSubtitle}>Doctor ka kamra mein chaliye</Text>
              {token.jitsi_room && (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={async () => {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    navigation.navigate('VideoCall', { 
                      jitsiRoom: token.jitsi_room, 
                      doctorName: token.doctors?.name || 'Doctor' 
                    });
                  }}
                >
                  <Ionicons name="videocam" size={24} color="white" />
                  <Text style={styles.callBtnText}>Video Call Shuru Karein</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoVal}>{Math.max(0, (queueHook.myPosition || 1) - 1)}</Text>
                  <Text style={styles.infoLabel}>Aapke Aage</Text>
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.infoVal}>{queueHook.estimatedWait ?? '?'}</Text>
                  <Text style={styles.infoLabel}>Min ka Wait</Text>
                </View>
              </View>

              {/* Progress bar */}
              <Text style={styles.progressLabel}>Queue Mein Position</Text>
              <View style={styles.progressBg}>
                <View
                  style={[styles.progressFill, {
                    width: `${Math.min(100, (1 / Math.max(queueHook.myPosition || 1, 1)) * 100)}%`,
                  }]}
                />
              </View>
            </>
          )}

          <Text style={styles.doctorName}>
            👨‍⚕️ Dr. {token.doctors?.name || 'Doctor'}
          </Text>
          <Text style={styles.syncNote}>🔄 Auto refresh ho raha hai</Text>
        </View>

        {/* Speak button */}
        <TouchableOpacity
          style={styles.speakBtn}
          onPress={() => speak(
            queueHook.isMyTurn
              ? 'Aapki baari aa gayi hai. Doctor ke paas chaliye.'
              : `Aapka token number ${token.token_number} hai. Aapke aage ${Math.max(0, (queueHook.myPosition || 1) - 1)} log hain.`
          )}
        >
          <Ionicons name="volume-high" size={22} color="#0d9488" />
          <Text style={styles.speakText}>Bol Ke Sunao</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  tokenCard: {
    borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 16,
  },
  tokenLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  tokenNumber: { color: 'white', fontSize: 96, fontWeight: '900', lineHeight: 104 },
  priorityChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  priorityText: { fontSize: 15, fontWeight: '700' },
  statusCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
  },
  turnTitle: { fontSize: 26, fontWeight: '900', color: '#1f2937', textAlign: 'center' },
  turnSubtitle: { fontSize: 17, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  callBtn: {
    backgroundColor: '#0d9488', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 16,
  },
  callBtnText: { color: 'white', fontWeight: '700', fontSize: 18 },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  infoBox: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 16, padding: 16, alignItems: 'center',
  },
  infoVal: { fontSize: 40, fontWeight: '900', color: '#0d9488' },
  infoLabel: { fontSize: 14, color: '#6b7280', fontWeight: '600', marginTop: 4 },
  progressLabel: { fontSize: 14, color: '#6b7280', fontWeight: '600', marginBottom: 8 },
  progressBg: { height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', backgroundColor: '#0d9488', borderRadius: 5 },
  doctorName: { fontSize: 17, fontWeight: '700', color: '#374151', textAlign: 'center' },
  syncNote: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 4 },
  speakBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#f0fdfa', borderWidth: 1.5, borderColor: '#99f6e4',
    paddingVertical: 16, borderRadius: 16,
  },
  speakText: { fontSize: 17, color: '#0d9488', fontWeight: '700' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#1f2937', marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 26, marginBottom: 28 },
  actionBtn: { backgroundColor: '#0d9488', paddingVertical: 18, paddingHorizontal: 32, borderRadius: 16 },
  actionBtnText: { color: 'white', fontWeight: '700', fontSize: 18 },
});
