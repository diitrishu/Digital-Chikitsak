import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from 'src/services/supabase';
import { useAuthStore } from 'src/store/useAuthStore';
import LoadingSpinner from 'src/components/LoadingSpinner';

const SPEC_LABELS = {
  general: 'General Physician', respiratory: 'Respiratory', gastroenterology: 'Gastroenterology',
  orthopedics: 'Orthopedics', dermatology: 'Dermatology', cardiology: 'Cardiology',
  pediatrics: 'Pediatrics', geriatrics: 'Geriatrics',
};

export default function ChatListScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState([]);
  const [onlineDoctors, setOnlineDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('chats');

  useEffect(() => {
    async function load() {
      if (!user?.phone) { setLoading(false); return; }
      const { data: patient } = await supabase.from('patients').select('id').eq('phone', user.phone).maybeSingle();
      if (!patient) { setLoading(false); return; }

      const { data: msgs } = await supabase.from('consultation_messages')
        .select('doctor_id, created_at, message_type, content, sender_role')
        .eq('patient_id', patient.id).order('created_at', { ascending: false });

      if (msgs) {
        const map = {};
        msgs.forEach(m => { if (!map[m.doctor_id]) map[m.doctor_id] = m; });
        const ids = Object.keys(map);
        if (ids.length > 0) {
          const { data: docs } = await supabase.from('doctors').select('id, name, specialization, status').in('id', ids);
          setConversations((docs || []).map(d => ({ ...d, lastMessage: map[d.id] })));
        }
      }

      const { data: docs } = await supabase.from('doctors').select('id, name, specialization, status').eq('status', 'online');
      setOnlineDoctors(docs || []);
      setLoading(false);
    }
    load();
  }, [user]);

  const preview = (msg) => {
    if (!msg) return 'Start a conversation';
    if (msg.message_type === 'text') return msg.content?.slice(0, 50);
    return '📎 Attachment';
  };

  if (loading) return <LoadingSpinner message="Loading messages..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.paddingView}>
        <Text style={styles.headerTitle}>Messages</Text>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {['chats', 'doctors'].map(t => (
            <TouchableOpacity key={t} onPress={() => setTab(t)}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'chats' ? 'My Chats' : 'Find Doctor'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'chats' ? (
          conversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles" size={40} color="#d1d5db" />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <TouchableOpacity onPress={() => setTab('doctors')} style={styles.startChatBtn}>
                <Text style={styles.startChatText}>Start a conversation</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Chat', { doctorId: item.id, doctorName: item.name })}
                  style={styles.chatCard}
                >
                  <View style={[styles.avatar, styles.blueAvatar]}>
                    <Ionicons name="medical" size={22} color="#3b82f6" />
                  </View>
                  <View style={styles.chatInfo}>
                    <Text style={styles.docName}>{item.name}</Text>
                    <Text style={styles.docSpec}>{SPEC_LABELS[item.specialization] || item.specialization}</Text>
                    <Text style={styles.msgPreview} numberOfLines={1}>{preview(item.lastMessage)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                </TouchableOpacity>
              )}
            />
          )
        ) : (
          <FlatList
            data={onlineDoctors}
            keyExtractor={item => item.id}
            ListHeaderComponent={() => <Text style={styles.listHeader}>Online doctors — tap to chat</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Chat', { doctorId: item.id, doctorName: item.name })}
                style={styles.chatCard}
              >
                <View style={[styles.avatar, styles.greenAvatar]}>
                  <Ionicons name="medical" size={22} color="#22c55e" />
                </View>
                <View style={styles.chatInfo}>
                  <Text style={styles.docName}>{item.name}</Text>
                  <Text style={styles.docSpec}>{SPEC_LABELS[item.specialization] || item.specialization}</Text>
                </View>
                <View style={styles.badgeOnline}>
                  <Text style={styles.badgeOnlineText}>Online</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  paddingView: { paddingHorizontal: 16, paddingVertical: 20, flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  tabsContainer: {
    flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 20,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  tabText: { fontSize: 14, fontWeight: '500', color: '#9ca3af' },
  tabTextActive: { color: '#1f2937' },
  emptyContainer: { alignItems: 'center', paddingVertical: 64 },
  emptyText: { color: '#9ca3af', fontSize: 14, marginTop: 12 },
  startChatBtn: { marginTop: 16, backgroundColor: '#14b8a6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  startChatText: { color: '#ffffff', fontSize: 14, fontWeight: '500' },
  chatCard: {
    backgroundColor: '#ffffff', borderRadius: 16, borderColor: '#f3f4f6', borderWidth: 1,
    padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center',
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  blueAvatar: { backgroundColor: '#dbeafe' },
  greenAvatar: { backgroundColor: '#dcfce7' },
  chatInfo: { flex: 1 },
  docName: { fontWeight: '600', color: '#1f2937', fontSize: 14 },
  docSpec: { fontSize: 12, color: '#9ca3af' },
  msgPreview: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  listHeader: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  badgeOnline: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeOnlineText: { fontSize: 12, color: '#15803d', fontWeight: '500' }
});
