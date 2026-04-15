import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MEMBER_TYPES = [
  { key: 'self', label: 'Main Khud', icon: 'person', color: '#0d9488' },
  { key: 'wife', label: 'Patni', icon: 'woman', color: '#ec4899' },
  { key: 'husband', label: 'Pati', icon: 'man', color: '#3b82f6' },
  { key: 'son', label: 'Beta', icon: 'happy', color: '#f59e0b' },
  { key: 'daughter', label: 'Beti', icon: 'flower', color: '#a855f7' },
  { key: 'father', label: 'Pitaji', icon: 'body', color: '#6366f1' },
  { key: 'mother', label: 'Mata Ji', icon: 'heart', color: '#ef4444' },
  { key: 'grandfather', label: 'Dada Ji', icon: 'walk', color: '#78716c' },
  { key: 'grandmother', label: 'Dadi Ji', icon: 'accessibility', color: '#84cc16' },
];

export default function FamilyScreen({ navigation }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem('family_members').then((raw) => {
      if (raw) setMembers(JSON.parse(raw));
    });
  }, []);

  const saveMembers = async (updated) => {
    setMembers(updated);
    await AsyncStorage.setItem('family_members', JSON.stringify(updated));
  };

  const addMember = async (type) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const exists = members.find((m) => m.type === type.key);
    if (exists) {
      Alert.alert('Already Added', `${type.label} already added hai.`);
      return;
    }
    const updated = [...members, { id: Date.now().toString(), type: type.key, label: type.label, icon: type.icon, color: type.color }];
    await saveMembers(updated);
  };

  const removeMember = (id) => {
    Alert.alert('Hatayein?', 'Kya aap is member ko hatana chahte hain?', [
      { text: 'Nahi', style: 'cancel' },
      { text: 'Hatao', style: 'destructive', onPress: async () => {
        const updated = members.filter((m) => m.id !== id);
        await saveMembers(updated);
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0d9488" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parivar ki Sehat 👨‍👩‍👧‍👦</Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Current family members */}
        {members.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aapka Parivar</Text>
            {members.map((m) => (
              <TouchableOpacity key={m.id} style={styles.memberCard} onLongPress={() => removeMember(m.id)}>
                <View style={[styles.memberIcon, { backgroundColor: m.color + '20' }]}>
                  <Ionicons name={m.icon} size={28} color={m.color} />
                </View>
                <Text style={styles.memberName}>{m.label}</Text>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </TouchableOpacity>
            ))}
            <Text style={styles.hint}>💡 Hatane ke liye card ko thodi der dabaaye rakhein</Text>
          </View>
        )}

        {/* Add new member */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parivar Member Jodein</Text>
          <View style={styles.grid}>
            {MEMBER_TYPES.map((type) => {
              const added = members.find((m) => m.type === type.key);
              return (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.typeCard, added && styles.typeCardAdded]}
                  onPress={() => addMember(type)}
                >
                  <View style={[styles.typeIcon, { backgroundColor: type.color + (added ? '30' : '15') }]}>
                    <Ionicons name={type.icon} size={28} color={type.color} />
                  </View>
                  <Text style={styles.typeLabel}>{type.label}</Text>
                  {added && <Ionicons name="checkmark-circle" size={16} color={type.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  section: { margin: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 10 },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
  },
  memberIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  memberName: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1f2937' },
  hint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '30%', backgroundColor: 'white', borderRadius: 16, padding: 12,
    alignItems: 'center', gap: 6, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
  },
  typeCardAdded: { borderWidth: 2, borderColor: '#0d9488' },
  typeIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 13, fontWeight: '700', color: '#374151', textAlign: 'center' },
});
