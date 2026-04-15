import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from 'src/services/supabase';
import { useAuthStore } from 'src/store/useAuthStore';

export default function ChatScreen({ route }) {
  const { doctorId, doctorName } = route.params;
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [patientId, setPatientId] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    async function init() {
      if (!user?.phone) return;
      const { data: patient } = await supabase.from('patients').select('id').eq('phone', user.phone).maybeSingle();
      if (patient) setPatientId(patient.id);

      const { data } = await supabase.from('consultation_messages')
        .select('*')
        .eq('patient_id', patient?.id)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    }
    init();
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!patientId) return;
    const channel = supabase.channel(`chat-${patientId}-${doctorId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'consultation_messages',
        filter: `doctor_id=eq.${doctorId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [patientId, doctorId]);

  const sendMessage = async () => {
    if (!text.trim() || !patientId) return;
    const msg = text.trim();
    setText('');
    const { error } = await supabase.from('consultation_messages').insert({
      patient_id: patientId, doctor_id: doctorId, sender_role: 'patient',
      message_type: 'text', content: msg,
    });
    if (!error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), patient_id: patientId, doctor_id: doctorId,
        sender_role: 'patient', message_type: 'text', content: msg, created_at: new Date().toISOString(),
      }]);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender_role === 'patient';
    return (
      <View style={[styles.msgWrapper, isMe ? styles.msgWrapperMe : styles.msgWrapperThem]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={isMe ? styles.bubbleTextMe : styles.bubbleTextThem}>{item.content}</Text>
        </View>
        <Text style={[styles.timeText, isMe && styles.timeTextRight]}>
          {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerAvatar}>
            <Ionicons name="medical" size={20} color="#0d9488" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.headerName}>{doctorName || 'Doctor'}</Text>
            <Text style={styles.headerStatus}>Online</Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, i) => item.id?.toString() || i.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color="#d1d5db" />
              <Text style={styles.emptyText}>Start your conversation</Text>
            </View>
          )}
        />

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            style={styles.input}
            multiline maxLength={500}
          />
          <TouchableOpacity onPress={sendMessage} disabled={!text.trim()}
            style={[styles.sendBtn, text.trim() ? styles.sendBtnActive : styles.sendBtnDisabled]}>
            <Ionicons name="send" size={16} color={text.trim() ? 'white' : '#9ca3af'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#ffffff', borderBottomColor: '#f3f4f6', borderBottomWidth: 1,
    paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  headerAvatar: {
    width: 40, height: 40, backgroundColor: '#f0fdfa', borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerName: { fontWeight: '600', color: '#1f2937', fontSize: 16 },
  headerStatus: { fontSize: 12, color: '#9ca3af' },
  msgList: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' },
  msgWrapper: { marginBottom: 8, maxWidth: '80%' },
  msgWrapperMe: { alignSelf: 'flex-end' },
  msgWrapperThem: { alignSelf: 'flex-start' },
  bubble: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { backgroundColor: '#0d9488', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#ffffff', borderColor: '#f3f4f6', borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleTextMe: { fontSize: 14, color: '#ffffff' },
  bubbleTextThem: { fontSize: 14, color: '#1f2937' },
  timeText: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  timeTextRight: { textAlign: 'right' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9ca3af', marginTop: 12, fontSize: 14 },
  inputRow: {
    backgroundColor: '#ffffff', borderTopColor: '#f3f4f6', borderTopWidth: 1,
    paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  input: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 14, color: '#1f2937',
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendBtnActive: { backgroundColor: '#0d9488' },
  sendBtnDisabled: { backgroundColor: '#e5e7eb' },
});
