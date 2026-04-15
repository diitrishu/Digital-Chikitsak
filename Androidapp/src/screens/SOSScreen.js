import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated, StyleSheet, Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { triggerSOS } from 'src/services/sosService';
import { useAuthStore } from 'src/store/useAuthStore';

export default function SOSScreen({ navigation }) {
  const [countdown, setCountdown] = useState(5);
  const [triggered, setTriggered] = useState(false);
  const user = useAuthStore((s) => s.user);
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Haptic + vibration warning
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Vibration.vibrate([0, 400, 200, 400]);

    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 5000,
      useNativeDriver: false,
    }).start();

    // Countdown
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          handleConfirm();
          return 0;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleConfirm = async () => {
    if (triggered) return;
    setTriggered(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    await triggerSOS(user?.name);
    navigation.goBack();
  };

  const handleCancel = () => {
    Vibration.cancel();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background pulsing */}
      <View style={styles.warningIcon}>
        <Ionicons name="warning" size={64} color="white" />
      </View>

      <Text style={styles.title}>EMERGENCY!</Text>
      <Text style={styles.subtitle}>
        {countdown > 0
          ? `${countdown} second mein call hoga…`
          : 'Call ho raha hai!'}
      </Text>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <Animated.View
          style={[styles.progressFill, {
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }]}
        />
      </View>

      <Text style={styles.info}>
        📍 Aapki location{'\n'}aapke emergency contact ko bheja jayega
      </Text>

      {/* Cancel Button */}
      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
        <Ionicons name="close-circle" size={28} color="#ef4444" />
        <Text style={styles.cancelText}>RUKO — Galti se hua</Text>
      </TouchableOpacity>

      {/* Confirm now */}
      <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
        <Ionicons name="call" size={24} color="white" />
        <Text style={styles.confirmText}>Abhi Call Karo</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#7f1d1d',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  warningIcon: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 42, fontWeight: '900', color: 'white', letterSpacing: 2 },
  subtitle: { fontSize: 22, color: '#fca5a5', marginTop: 8, marginBottom: 28, textAlign: 'center' },
  progressBg: {
    width: '100%', height: 8, backgroundColor: '#991b1b',
    borderRadius: 4, overflow: 'hidden', marginBottom: 32,
  },
  progressFill: { height: '100%', backgroundColor: '#ef4444', borderRadius: 4 },
  info: {
    fontSize: 16, color: '#fca5a5', textAlign: 'center',
    lineHeight: 26, marginBottom: 40,
  },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'white', paddingVertical: 18, paddingHorizontal: 32,
    borderRadius: 16, marginBottom: 16, width: '100%', justifyContent: 'center',
  },
  cancelText: { fontSize: 20, fontWeight: '800', color: '#ef4444' },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ef4444', paddingVertical: 16, paddingHorizontal: 32,
    borderRadius: 16, width: '100%', justifyContent: 'center',
  },
  confirmText: { fontSize: 18, fontWeight: '700', color: 'white' },
});
