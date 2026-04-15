import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import SymptomChips from 'src/components/SymptomChips';
import QueueCard from 'src/components/QueueCard';
import { useConsultationStore } from 'src/store/useConsultationStore';
import { useAuthStore } from 'src/store/useAuthStore';
import { triage, extractSymptoms, symptomsToMLPayload } from 'src/services/triage';
import { generateToken, findBestDoctor, getJitsiRoomId } from 'src/services/queueService';
import { supabase } from 'src/services/supabase';
import { useQueue } from 'src/hooks/useQueue';
import api from 'src/services/api';
import { speak } from 'src/services/voiceService';

const SPEC_LABELS = {
  general: 'Sadharan Doctor', respiratory: 'Saans ke Doctor',
  gastroenterology: 'Pet ke Doctor', orthopedics: 'Haddi ke Doctor',
  dermatology: 'Skin ke Doctor', cardiology: 'Dil ke Doctor',
  pediatrics: 'Bacchon ke Doctor', geriatrics: 'Buzurgon ke Doctor',
};

const PRIORITY_CONFIG = {
  emergency: { label: '🚨 Emergency', bg: '#fee2e2', text: '#b91c1c' },
  senior: { label: '👴 Senior Priority', bg: '#ffedd5', text: '#c2410c' },
  child: { label: '👦 Child Priority', bg: '#dbeafe', text: '#1d4ed8' },
  general: { label: '✅ General', bg: '#dcfce7', text: '#15803d' },
};

const STEPS = ['input', 'confirm', 'result', 'queue'];

export default function SymptomCheckerScreen() {
  const store = useConsultationStore();
  const user = useAuthStore((s) => s.user);
  const [patientInfo, setPatientInfo] = useState(null);
  const [activeToken, setActiveToken] = useState(null);

  useEffect(() => {
    async function resolve() {
      if (!user?.phone) return;
      const { data } = await supabase.from('patients').select('id,name,age,phone').eq('phone', user.phone).maybeSingle();
      if (data) { setPatientInfo(data); return; }
      const { data: created } = await supabase.from('patients')
        .upsert({ name: user.name || user.phone, phone: user.phone, age: null }, { onConflict: 'phone' })
        .select('id,name,age,phone').single();
      if (created) setPatientInfo(created);
    }
    resolve();
  }, [user]);

  const handleAnalyze = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const fromText = extractSymptoms(store.textInput);
    const all = Array.from(new Set([...fromText, ...store.tappedSymptoms]));
    if (all.length === 0) { 
      speak("Kripya kam se kam ek pareshani batayein");
      Toast.show({ type: 'error', text1: 'Bimari batayein' }); 
      return; 
    }
    const result = triage({ symptoms: all, age: patientInfo?.age || null });
    store.setExtractedSymptoms(all);
    store.setTriageResult(result);
    store.setStep('confirm');
    speak(`Aapko ${all.length} pareshani hai. Kya yeh sahi hai? Sabse neeche 'Haan Sahi Hai' button dabayein.`);
  };

  const handleConfirm = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    store.setProcessing(true, 'AI check kar raha hai...');
    speak('AI aapki bimari check kar raha hai, kripya intezar karein.');
    try {
      const payload = symptomsToMLPayload(store.extractedSymptoms);
      const ml = await api.predictDisease(payload);
      store.setMlResult(ml);
      speak(`Check pura hua. Bimari ka naam ${ml.predicted_disease} ho sakta hai.`);
    } catch { 
      speak("Pura check nahi ho paya, par doctor se jodne ka option neeche hai.");
    }
    store.setProcessing(false);
    store.setStep('result');
  };

  const handleJoinQueue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!patientInfo?.id) { Toast.show({ type: 'error', text1: 'Login karein' }); return; }
    store.setProcessing(true, 'Doctor dhundh rahe hain...');
    try {
      const doctor = await findBestDoctor(store.triageResult.specialization);
      if (doctor && doctor.waitingCount === 0 && doctor.status === 'online') {
        const jitsiRoom = getJitsiRoomId(Date.now().toString());
        const { data: maxRow } = await supabase.from('tokens')
          .select('token_number').eq('doctor_id', doctor.id).order('token_number', { ascending: false }).limit(1).maybeSingle();
        const tokenNumber = maxRow ? maxRow.token_number + 1 : 1;
        const { data: token, error } = await supabase.from('tokens')
          .insert({
            token_number: tokenNumber, patient_id: patientInfo.id, doctor_id: doctor.id,
            status: 'in_consultation', priority: store.triageResult.priority,
            symptoms_summary: store.extractedSymptoms.join(', '), jitsi_room: jitsiRoom,
            called_at: new Date().toISOString(),
          }).select('*, doctors(name, specialization, avg_consult_time)').single();
        if (!error && token) {
          await supabase.from('doctors').update({ status: 'in_call', current_patient_id: patientInfo.id }).eq('id', doctor.id);
          setActiveToken(token);
          store.setStep('queue');
          store.setProcessing(false);
          speak('Doctor abhi free hain. Aapki call directly lag rahi hai.');
          return;
        }
      }
      
      const token = await generateToken({
        patientId: patientInfo.id, priority: store.triageResult.priority,
        specialization: store.triageResult.specialization, symptomsSummary: store.extractedSymptoms.join(', '),
      });
      setActiveToken(token);
      store.setStep('queue');
      speak(`Aapka baari aane ka token number ${token.token_number} hai.`);
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Token nahi mila' });
      speak("Token banne mein problem aayi hai. Network check karke dobara try karein.");
    } finally {
      store.setProcessing(false);
    }
  };

  const handleReset = () => { store.reset(); setActiveToken(null); };

  const pc = store.triageResult ? PRIORITY_CONFIG[store.triageResult.priority] : null;
  const queueHook = useQueue(activeToken?.doctor_id, activeToken?.id, activeToken?.token_number);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        
        {/* Step Indicator */}
        {store.step !== 'queue' && (
          <View style={styles.stepBox}>
            <Text style={styles.stepText}>
              Kadam {STEPS.indexOf(store.step) + 1} / 3: 
              {store.step === 'input' ? ' Bimari Batayein' : 
               store.step === 'confirm' ? ' Pukka Karein' : ' Result Dekhein'}
            </Text>
          </View>
        )}

        {/* STEP 1: INPUT */}
        {store.step === 'input' && (
          <View style={styles.card}>
            <Text style={styles.title}>Aapko kya pareshani hai?</Text>
            <Text style={styles.subtitle}>Neeche dabakar chunein ya type karein</Text>
            
            <View style={styles.inputWrap}>
              <TextInput
                value={store.textInput}
                onChangeText={store.setTextInput}
                placeholder="Jaise: Bukhar aur Khansi..."
                placeholderTextColor="#9ca3af"
                multiline numberOfLines={3}
                style={styles.textInput}
                textAlignVertical="top"
              />
            </View>
            
            <SymptomChips selected={store.tappedSymptoms} onToggle={store.toggleSymptom} />
            
            <TouchableOpacity
              onPress={handleAnalyze}
              disabled={!store.textInput.trim() && store.tappedSymptoms.length === 0}
              style={[styles.bigBtn, (!store.textInput.trim() && store.tappedSymptoms.length === 0) && { opacity: 0.5 }]}
            >
              <Text style={styles.bigBtnText}>Aage Badhein</Text>
              <Ionicons name="arrow-forward" size={24} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: CONFIRM */}
        {store.step === 'confirm' && (
          <View style={styles.card}>
            <Text style={styles.title}>Kya yeh pareshani sahi hai?</Text>
            
            {pc && (
              <View style={[styles.priorityBox, { backgroundColor: pc.bg }]}>
                <Text style={[styles.priorityLabel, { color: pc.text }]}>{pc.label}</Text>
                <Text style={[styles.prioritySub, { color: pc.text }]}>{store.triageResult.reasoning}</Text>
                <Text style={[styles.priorityDoc, { color: pc.text }]}>Doctor: {SPEC_LABELS[store.triageResult.specialization] || store.triageResult.specialization}</Text>
              </View>
            )}
            
            <View style={styles.selectedBox}>
              <Text style={styles.selectedLabel}>Aapki Bimariyan:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {store.extractedSymptoms.map(sym => (
                  <View key={sym} style={styles.chip}>
                    <Text style={styles.chipText}>{sym.replace(/_/g, ' ')}</Text>
                    <TouchableOpacity onPress={() => store.removeSymptom(sym)}>
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={store.extractedSymptoms.length === 0 || store.processing}
              style={[styles.bigBtn, store.processing && { opacity: 0.5 }]}
            >
              {store.processing ? <ActivityIndicator size="large" color="white" /> : (
                <Text style={styles.bigBtnText}>Haan, Sahi Hai</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => store.setStep('input')} style={styles.outlineBtn}>
              <Text style={styles.outlineBtnText}>Nahi, Badlav Karein</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: RESULT */}
        {store.step === 'result' && (
          <View style={styles.card}>
            <Text style={styles.title}>AI Ki Report</Text>
            
            {store.mlResult ? (
              <View style={styles.resultBox}>
                <Text style={styles.resultSub}>Aapko shayed yeh ho sakta hai:</Text>
                <Text style={styles.resultMain}>{store.mlResult.predicted_disease}</Text>
                <Text style={styles.resultProb}>Sambhavna: {store.mlResult.confidence}%</Text>
              </View>
            ) : (
              <View style={[styles.resultBox, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                <Text style={[styles.resultMain, { color: '#d97706', fontSize: 18 }]}>AI ko theek se samajh nahi aaya, par Doctor zaroor bata denge.</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleJoinQueue}
              disabled={store.processing}
              style={[styles.bigBtn, store.processing && { opacity: 0.5 }, { marginTop: 24, paddingVertical: 24 }]}
            >
              {store.processing ? <ActivityIndicator size="large" color="white" /> : (
                <>
                  <Ionicons name="videocam" size={28} color="white" />
                  <Text style={[styles.bigBtnText, { fontSize: 22 }]}>Doctor Se Judein</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 4: QUEUE */}
        {store.step === 'queue' && activeToken && (
          <View>
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.title}>Aapki Baari</Text>
              <Text style={styles.subtitle}>Doctor jaldi hi aapse baat karenge</Text>
            </View>
            <QueueCard
              token={activeToken}
              myPosition={queueHook.myPosition}
              estimatedWait={queueHook.estimatedWait}
              isMyTurn={queueHook.isMyTurn}
              jitsiRoomId={queueHook.jitsiRoomId}
              channelStatus={queueHook.channelStatus}
              onRefresh={queueHook.refresh}
            />
            <TouchableOpacity onPress={handleReset} style={[styles.outlineBtn, { marginTop: 20 }]}>
              <Text style={styles.outlineBtnText}>Nayi Bimari Check Karein</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  
  stepBox: { backgroundColor: '#e5e7eb', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 16 },
  stepText: { fontSize: 16, fontWeight: '800', color: '#4b5563' },
  
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  title: { fontSize: 26, fontWeight: '900', color: '#1f2937' },
  subtitle: { fontSize: 18, color: '#6b7280', marginTop: 4, marginBottom: 20 },
  
  inputWrap: { marginBottom: 20 },
  textInput: {
    borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 16, fontSize: 20, backgroundColor: '#f9fafb', color: '#1f2937'
  },
  
  bigBtn: {
    backgroundColor: '#0d9488', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingVertical: 20, borderRadius: 20, marginTop: 16, elevation: 4, shadowColor: '#0d9488',
  },
  bigBtnText: { color: 'white', fontWeight: '900', fontSize: 20 },
  
  outlineBtn: {
    backgroundColor: 'white', borderWidth: 2, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 20, marginTop: 12,
  },
  outlineBtnText: { color: '#4b5563', fontWeight: '800', fontSize: 18 },
  
  priorityBox: { padding: 16, borderRadius: 16, marginBottom: 20 },
  priorityLabel: { fontSize: 20, fontWeight: '900' },
  prioritySub: { fontSize: 16, marginTop: 4, fontWeight: '600' },
  priorityDoc: { fontSize: 14, marginTop: 8, fontWeight: '700' },
  
  selectedBox: { borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 12 },
  selectedLabel: { fontSize: 18, fontWeight: '800', color: '#4b5563' },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdfa', borderWidth: 1, borderColor: '#5eead4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 8 },
  chipText: { fontSize: 18, fontWeight: '700', color: '#0f766e' },
  
  resultBox: { backgroundColor: '#f0fdfa', borderWidth: 2, borderColor: '#99f6e4', borderRadius: 20, padding: 20 },
  resultSub: { fontSize: 16, fontWeight: '700', color: '#0f766e', marginBottom: 4 },
  resultMain: { fontSize: 32, fontWeight: '900', color: '#115e59' },
  resultProb: { fontSize: 16, color: '#0d9488', fontWeight: '700', marginTop: 12 },
});
