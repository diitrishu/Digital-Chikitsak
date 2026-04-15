import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from 'src/store/useAuthStore';
import * as Haptics from 'expo-haptics';
import { navigate } from 'src/navigation/navigationRef';

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Su-Prabhat (Good Morning)';
    if (h < 17) return 'Namaskar (Good Afternoon)';
    return 'Shubh Sandhya (Good Evening)';
  };

  const navigateTo = async (screen) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    navigate(screen);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.paddingLayout}>

          {/* Welcome section */}
          <View style={styles.welcomeBox}>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.nameText}>🙏 {user?.name || 'Patient'} Ji</Text>
            <Text style={styles.subtitleText}>Aaj kaisa feel ho raha hai?</Text>
          </View>

          {/* 2x2 Grid of Big Actions */}
          <View style={styles.grid}>
            <TouchableOpacity style={styles.bigGridBtn} onPress={() => navigateTo('SymptomChecker')}>
              <Ionicons name="fitness" size={42} color="#0d9488" />
              <Text style={styles.bigGridText}>DOCTOR CHAHIYE</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.bigGridBtn} onPress={() => navigateTo('Reminders')}>
              <Ionicons name="medical" size={42} color="#f59e0b" />
              <Text style={styles.bigGridText}>DAWAI YAAD</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bigGridBtn} onPress={() => navigateTo('ChatList')}>
              <Ionicons name="chatbubbles" size={42} color="#3b82f6" />
              <Text style={styles.bigGridText}>DOCTOR SE BAAT</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.bigGridBtn} onPress={() => navigateTo('HealthRecords')}>
              <Ionicons name="document-text" size={42} color="#ec4899" />
              <Text style={styles.bigGridText}>MERI REPORT</Text>
            </TouchableOpacity>
          </View>

          {/* Other Useful Options */}
          <Text style={styles.sectionTitle}>Aur Jankari</Text>
          
          <TouchableOpacity style={styles.listBtn} onPress={() => navigateTo('BookDoctor')}>
            <View style={[styles.iconWrap, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="search" size={28} color="#0284c7" />
            </View>
            <Text style={styles.listText}>Naya Doctor Dhundho</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.listBtn} onPress={() => navigateTo('TokenStatus')}>
            <View style={[styles.iconWrap, { backgroundColor: '#fef9c3' }]}>
              <Ionicons name="ticket" size={28} color="#ca8a04" />
            </View>
            <Text style={styles.listText}>Mera Token Number</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.listBtn} onPress={() => navigateTo('HealthEducation')}>
            <View style={[styles.iconWrap, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="book" size={28} color="#9333ea" />
            </View>
            <Text style={styles.listText}>Sehat Ki Jaankari</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.listBtn} onPress={() => navigateTo('Family')}>
            <View style={[styles.iconWrap, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="people" size={28} color="#16a34a" />
            </View>
            <Text style={styles.listText}>Mera Parivar</Text>
          </TouchableOpacity>

          {/* Emergency SOS Button */}
          <TouchableOpacity style={styles.sosButton} onPress={() => navigateTo('SOS')}>
            <Ionicons name="warning" size={32} color="white" />
            <Text style={styles.sosText}>EMERGENCY HELP</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  paddingLayout: { padding: 16, gap: 16 },
  welcomeBox: {
    backgroundColor: '#0d9488', borderRadius: 20, padding: 24, paddingVertical: 28,
  },
  greetingText: { fontSize: 16, color: '#ccfbf1', marginBottom: 4 },
  nameText: { fontSize: 26, fontWeight: '900', color: 'white', marginBottom: 8 },
  subtitleText: { fontSize: 18, color: '#99f6e4' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  bigGridBtn: {
    width: '48%', backgroundColor: 'white', padding: 24, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, minHeight: 140,
  },
  bigGridText: { fontSize: 16, fontWeight: '800', color: '#1f2937', textAlign: 'center' },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#4b5563', marginTop: 8 },
  
  listBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: 'white', padding: 16, borderRadius: 16, elevation: 1, shadowOpacity: 0.04,
  },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  listText: { fontSize: 18, fontWeight: '700', color: '#1f2937', flex: 1 },
  
  sosButton: {
    backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingVertical: 20, borderRadius: 20, marginTop: 12, elevation: 4, shadowColor: '#ef4444',
  },
  sosText: { fontSize: 20, fontWeight: '900', color: 'white', letterSpacing: 1 },
});

