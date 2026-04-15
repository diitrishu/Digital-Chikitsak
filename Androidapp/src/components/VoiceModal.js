import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated,
  StyleSheet, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseVoiceCommand, executeVoiceCommand, speak } from 'src/services/voiceService';
import { useAuthStore } from 'src/store/useAuthStore';

export default function VoiceModal({ visible, onClose }) {
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState('idle'); // idle | listening | processing | done
  const [matchedCmd, setMatchedCmd] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (visible) {
      setInputText('');
      setStatus('listening');
      setMatchedCmd(null);
      startPulse();
      speak('Boliye, main sun raha hoon…');
    } else {
      setStatus('idle');
      pulseAnim.stopAnimation();
    }
  }, [visible]);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleProcess = () => {
    if (!inputText.trim()) return;
    setStatus('processing');
    pulseAnim.stopAnimation();
    const cmd = parseVoiceCommand(inputText);
    setMatchedCmd(cmd);
    if (cmd) {
      setStatus('done');
      setTimeout(() => {
        onClose();
        executeVoiceCommand(cmd, { logout });
        setInputText('');
      }, 1200);
    } else {
      setStatus('idle');
      speak('Maafi kijiye, samajh nahi aaya. Dobara boliye.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>🎤 Bol Ke Karo</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Mic with pulse animation */}
            <View style={styles.micContainer}>
              <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
              <View style={[styles.micCircle, status === 'done' && styles.micDone]}>
                <Ionicons
                  name={status === 'done' ? 'checkmark' : 'mic'}
                  size={48}
                  color="white"
                />
              </View>
            </View>

            {/* Status text */}
            <Text style={styles.statusText}>
              {status === 'idle' && 'Kuch boliye ya type karein…'}
              {status === 'listening' && '🎙️ Sun raha hoon…'}
              {status === 'processing' && '🤔 Samajh raha hoon…'}
              {status === 'done' && `✅ ${matchedCmd?.response || 'Kar raha hoon…'}`}
            </Text>

            {/* Text input (type if mic doesn't work) */}
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Yahaan type karein ya bol ke boliye…"
              placeholderTextColor="#9ca3af"
              fontSize={18}
              autoFocus
              onSubmitEditing={handleProcess}
            />

            {/* Quick command chips */}
            <Text style={styles.quickLabel}>Jaldi boliye:</Text>
            <View style={styles.chips}>
              {['Doctor chahiye', 'Mera token', 'Emergency', 'Dawai reminder'].map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={styles.chip}
                  onPress={() => {
                    setInputText(chip);
                    setTimeout(handleProcess, 100);
                  }}
                >
                  <Text style={styles.chipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitBtn, !inputText.trim() && { opacity: 0.4 }]}
              onPress={handleProcess}
              disabled={!inputText.trim()}
            >
              <Ionicons name="arrow-forward-circle" size={24} color="white" />
              <Text style={styles.submitText}>Karo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#1f2937' },
  closeBtn: { padding: 4 },
  micContainer: { alignItems: 'center', marginBottom: 16 },
  pulseRing: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(13,148,136,0.15)',
  },
  micCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center',
  },
  micDone: { backgroundColor: '#22c55e' },
  statusText: { textAlign: 'center', fontSize: 17, color: '#374151', fontWeight: '600', marginBottom: 16 },
  input: {
    borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 16,
    padding: 16, fontSize: 18, color: '#1f2937', marginBottom: 16,
  },
  quickLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '600', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    backgroundColor: '#f0fdfa', borderWidth: 1, borderColor: '#99f6e4',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  chipText: { color: '#0d9488', fontWeight: '600', fontSize: 14 },
  submitBtn: {
    backgroundColor: '#0d9488', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 16,
  },
  submitText: { color: 'white', fontWeight: '700', fontSize: 18 },
});
