import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

// Graceful fallback if native module is not available (e.g. Expo Go)
let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent = (_event, _cb) => {};
try {
  const stt = require('@jamsch/expo-speech-recognition');
  ExpoSpeechRecognitionModule = stt.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = stt.useSpeechRecognitionEvent;
} catch (e) {
  console.log('Speech recognition native module not available — running in fallback mode');
}
import {
  parseTranscript,
  isEmergency,
  speak,
  requestPermissions,
  isSTTAvailable,
} from 'src/services/voiceService';
import * as SecureStore from 'expo-secure-store';

const LANG_MAP = { hi: 'hi-IN', pa: 'pa-IN', en: 'en-IN' };

export default function VoiceOnboardingScreen({ navigation }) {
  const [phase, setPhase] = useState('idle'); // idle | listening | processing | result | fallback
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [appLang, setAppLang] = useState('hi-IN');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hasPermission = useRef(false);
  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  // Load language preference
  useEffect(() => {
    (async () => {
      const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const lang = await AsyncStorage.getItem('@dc_language') || 'hi';
      setAppLang(LANG_MAP[lang] || 'hi-IN');
    })();
  }, []);

  // Pulse animation for recording indicator
  useEffect(() => {
    if (phase === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [phase]);

  // STT event listeners
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    if (event.isFinal) {
      setTranscript(prev => prev + ' ' + text);
      setInterimText('');
    } else {
      setInterimText(text);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setInterimText('');
    setPhase('processing');
    setTranscript(prev => {
      if (prev.trim().length > 2) {
        processTranscript(prev.trim());
      } else {
        setPhase('fallback');
      }
      return prev;
    });
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.warn('STT error:', event.error);
    if (event.error === 'no-speech') {
      setPhase('fallback');
    } else {
      setPhase('fallback');
    }
  });

  async function startListening() {
    if (!ExpoSpeechRecognitionModule) { setPhase('fallback'); return; }
    if (!hasPermission.current) {
      const granted = await requestPermissions();
      if (!granted) { setPhase('fallback'); return; }
      hasPermission.current = true;
    }
    if (!isSTTAvailable()) { setPhase('fallback'); return; }

    setTranscript('');
    setInterimText('');
    setPhase('listening');

    ExpoSpeechRecognitionModule.start({
      lang: appLang,
      interimResults: true,
      continuous: false,
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
        EXTRA_MASK_OFFENSIVE_WORDS: false,
      },
      iosTaskHint: 'dictation',
    });
  }

  async function processTranscript(text) {
    const emergency = isEmergency(text);
    const symptoms = parseTranscript(text, appLang);
    const detectedList = Object.entries(symptoms).filter(([, v]) => v === 1).map(([k]) => k);

    if (emergency) {
      setAnalysisResult({
        symptoms, prediction: 'Emergency', confidence: 1.0,
        priority: 'emergency', transcript: text, geminiSummary: '', detectedList
      });
      speak('Yeh emergency lag rahi hai. Doctor se turant mile.', appLang);
      setPhase('result');
      return;
    }

    const token = await SecureStore.getItemAsync('auth_token') || '';
    let mlResult = { predicted_disease: 'Unknown', confidence: 0, see_doctor: true };
    try {
      const mlRes = await fetch(`${API_URL.replace('/api', '')}/api/v1/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms })
      });
      if (mlRes.ok) mlResult = await mlRes.json();
    } catch (err) {
      console.warn('ML predict failed:', err.message);
    }

    let geminiSummary = '';
    try {
      const gemRes = await fetch(`${API_URL}/ai/voice-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ transcript: text, symptoms, lang: appLang.split('-')[0] })
      });
      if (gemRes.ok) {
        const gemData = await gemRes.json();
        geminiSummary = gemData.summary || '';
      }
    } catch { /* silent */ }

    let priority = 'general';
    const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const age = parseInt(await AsyncStorage.getItem('@dc_patient_age') || '30');
    if (age >= 60) priority = 'senior';
    if (age < 12) priority = 'child';

    setAnalysisResult({
      symptoms,
      prediction: mlResult.predicted_disease || 'Unknown',
      confidence: mlResult.confidence || 0,
      priority,
      transcript: text,
      geminiSummary,
      detectedList,
      seeDoctor: mlResult.see_doctor
    });

    if (mlResult.predicted_disease && mlResult.predicted_disease !== 'Unknown') {
      speak(`Aapko ${mlResult.predicted_disease} ho sakta hai. Doctor se mile.`, appLang);
    }

    setPhase('result');
  }

  function handleProceed() {
    import('@react-native-async-storage/async-storage').then(({ AsyncStorage }) => {
      AsyncStorage.setItem('@dc_voice_analysis', JSON.stringify(analysisResult));
      AsyncStorage.setItem('@dc_voice_transcript', analysisResult.transcript || '');
    });
    // Assuming SymptomChecker will auto-populate and proceed
    navigation.navigate('MainTabs', { screen: 'Consult' });
  }

  function handleSkip() {
    navigation.navigate('MainTabs', { screen: 'Consult' });
  }

  if (phase === 'fallback') {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⌨️</Text>
        <Text style={styles.title}>Symptoms manually chunein</Text>
        <Text style={styles.subtitle}>Voice supported nahi hua is device par</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleSkip}>
          <Text style={styles.primaryBtnText}>Symptoms Select Karein</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}>
          <Text style={styles.secondaryBtnText}>Dashboard par jayein</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'idle' || phase === 'listening') {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.micCircle, { transform: [{ scale: pulseAnim }] },
          phase === 'listening' ? styles.micActive : styles.micIdle]}>
          <Text style={{ fontSize: 40 }}>🎤</Text>
        </Animated.View>
        <Text style={styles.title}>
          {phase === 'listening' ? 'Sun raha hun...' : 'Apni takleef batayein'}
        </Text>
        <Text style={styles.subtitle}>
          Hindi, Punjabi ya English mein bolein
        </Text>
        {transcript !== '' && (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>Suna:</Text>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        )}
        {interimText !== '' && (
          <Text style={styles.interimText}>{interimText}...</Text>
        )}
        {phase === 'idle' && (
          <TouchableOpacity style={styles.primaryBtn} onPress={startListening}>
            <Text style={styles.primaryBtnText}>Tap Karein Aur Bolein</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip karein (Manual Type)</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })} style={[styles.skipBtn, { marginTop: 24 }]}>
          <Text style={[styles.skipText, { color: '#0f766e', textDecorationLine: 'none', fontWeight: 'bold' }]}>Dashboard Par Jayein ➡️</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'processing') {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⏳</Text>
        <Text style={styles.title}>Analysis ho raha hai...</Text>
      </View>
    );
  }

  if (phase === 'result' && analysisResult) {
    const { prediction, confidence, priority, detectedList, geminiSummary, transcript } = analysisResult;
    const priorityColor = { emergency: '#ef4444', senior: '#f97316', child: '#3b82f6', general: '#14b8a6' };

    return (
      <View style={[styles.container, { justifyContent: 'flex-start', paddingTop: 60 }]}>
        {priority === 'emergency' && (
          <View style={styles.emergencyBanner}>
            <Text style={styles.emergencyText}>⚠️ EMERGENCY — Turant Doctor se Mile</Text>
          </View>
        )}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>SAMBHAVIT BIMARI</Text>
          <Text style={styles.predictionText}>{prediction}</Text>
          {confidence > 0 && (
            <View style={styles.confidenceBar}>
              <View style={[styles.confidenceFill, { width: `${Math.round(confidence * 100)}%` }]} />
            </View>
          )}
          <Text style={styles.cardLabel}>{Math.round(confidence * 100)}% confident</Text>
        </View>
        {detectedList.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>DETECTED SYMPTOMS</Text>
            <View style={styles.chipRow}>
              {detectedList.map(s => (
                <View key={s} style={styles.chip}>
                  <Text style={styles.chipText}>{s.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {geminiSummary !== '' && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>AI SUJHAV</Text>
            <Text style={styles.geminiText}>{geminiSummary}</Text>
          </View>
        )}
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor[priority] + '20', borderColor: priorityColor[priority] }]}>
          <Text style={[styles.priorityText, { color: priorityColor[priority] }]}>
            Priority: {priority.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleProceed}>
          <Text style={styles.primaryBtnText}>
            {priority === 'emergency' ? 'Turant Madad Le' : 'Doctor Dhundein'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkip}>
          <Text style={styles.secondaryBtnText}>Symptoms Manually Edit Karein</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', padding: 20 },
  icon: { fontSize: 60, marginBottom: 16 },
  micCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  micIdle: { backgroundColor: '#d1fae5' },
  micActive: { backgroundColor: '#14b8a6' },
  title: { fontSize: 26, fontWeight: '800', color: '#1e293b', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  transcriptBox: { backgroundColor: '#ccfbf1', borderRadius: 12, padding: 14, width: '100%', marginBottom: 12 },
  transcriptLabel: { fontSize: 11, color: '#0f766e', fontWeight: '600', marginBottom: 4 },
  transcriptText: { fontSize: 16, color: '#134e4a', fontWeight: 'bold' },
  interimText: { color: '#0d9488', fontSize: 13, fontStyle: 'italic', marginBottom: 12 },
  primaryBtn: { backgroundColor: '#14b8a6', paddingVertical: 18, paddingHorizontal: 32, borderRadius: 16, width: '100%', alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  secondaryBtn: { borderWidth: 1.5, borderColor: '#cbd5e1', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16, width: '100%', alignItems: 'center' },
  secondaryBtnText: { color: '#475569', fontSize: 15, fontWeight: '700' },
  skipBtn: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 20 },
  skipText: { color: '#94a3b8', fontSize: 16, textDecorationLine: 'underline' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: '100%', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  predictionText: { fontSize: 22, fontWeight: '800', color: '#0f766e' },
  confidenceBar: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginTop: 8, marginBottom: 4, overflow: 'hidden' },
  confidenceFill: { height: '100%', backgroundColor: '#14b8a6', borderRadius: 3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#ccfbf1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipText: { color: '#0f766e', fontSize: 14, fontWeight: '600' },
  geminiText: { fontSize: 16, color: '#374151', lineHeight: 22 },
  priorityBadge: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 20 },
  priorityText: { fontWeight: '800', fontSize: 16 },
  emergencyBanner: { backgroundColor: '#ef4444', borderRadius: 12, padding: 14, width: '100%', alignItems: 'center', marginBottom: 12 },
  emergencyText: { color: '#fff', fontWeight: '900', fontSize: 18 },
});
