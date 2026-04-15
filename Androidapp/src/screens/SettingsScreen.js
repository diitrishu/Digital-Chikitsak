import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Switch, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from 'src/store/useAuthStore';
import * as Haptics from 'expo-haptics';
import { isBiometricEnabled, enableBiometric, disableBiometric } from 'src/services/biometricService';
import { getEmergencyContact, setEmergencyContact } from 'src/services/sosService';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [sosNumber, setSosNumber] = useState('112');
  const [isEditingSos, setIsEditingSos] = useState(false);

  useEffect(() => {
    isBiometricEnabled().then(setBioEnabled);
    getEmergencyContact().then(setSosNumber);
  }, []);

  const toggleBiometric = async (value) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBioEnabled(value);
    if (value) await enableBiometric();
    else await disableBiometric();
  };

  const saveSosNumber = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setEmergencyContact(sosNumber);
    setIsEditingSos(false);
  };

  const handleLogout = () => {
    Alert.alert('Bahar Jayein?', 'Kya aap app se bahar jaana chahte hain?', [
      { text: 'Nahi', style: 'cancel' },
      { text: 'Haan, Bahar Jayein', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.paddingLayout}>

          {/* Profile card */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color="#0d9488" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user?.name || 'Patient'}</Text>
              <Text style={styles.phone}>{user?.phone}</Text>
              {user?.age && <Text style={styles.subtext}>Umar: {user.age} saal</Text>}
            </View>
          </View>

          {/* Settings Group */}
          <Text style={styles.sectionTitle}>App Ki Settings</Text>

          <View style={styles.settingsGroup}>
            {/* Biometric Toggle */}
            <View style={styles.settingItem}>
              <View style={[styles.iconWrap, { backgroundColor: '#f0fdfa' }]}>
                <Ionicons name="finger-print" size={28} color="#0d9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Fingerprint se kholen</Text>
                <Text style={styles.settingSub}>PIN yaad rakhne ki zaroorat nahi</Text>
              </View>
              <Switch
                value={bioEnabled}
                onValueChange={toggleBiometric}
                trackColor={{ false: '#d1d5db', true: '#5eead4' }}
                thumbColor={bioEnabled ? '#0d9488' : '#9ca3af'}
                style={{ transform: [{ scale: 1.2 }] }}
              />
            </View>

            <View style={styles.divider} />

            {/* SOS Contact */}
            <View style={[styles.settingItem, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={[styles.iconWrap, { backgroundColor: '#fef2f2' }]}>
                  <Ionicons name="warning" size={28} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Emergency Contact</Text>
                  <Text style={styles.settingSub}>SOS dabane par is number par call jayega</Text>
                </View>
                {!isEditingSos && (
                  <TouchableOpacity onPress={() => setIsEditingSos(true)}>
                    <Text style={styles.editText}>Badlen</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {isEditingSos ? (
                <View style={styles.sosEditBox}>
                  <TextInput
                    style={styles.sosInput}
                    value={sosNumber}
                    onChangeText={setSosNumber}
                    keyboardType="phone-pad"
                    placeholder="Mobile number"
                  />
                  <TouchableOpacity style={styles.sosSaveBtn} onPress={saveSosNumber}>
                    <Text style={styles.sosSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.sosNumberText}>{sosNumber}</Text>
              )}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Madad</Text>
          <View style={styles.settingsGroup}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="call" size={28} color="#3b82f6" />
              </View>
              <Text style={styles.settingLabel}>Customer Care</Text>
              <Ionicons name="chevron-forward" size={24} color="#d1d5db" />
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out" size={28} color="#ef4444" />
            <Text style={styles.logoutText}>Bahar Jayein (Logout)</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  paddingLayout: { padding: 16, gap: 16 },
  
  profileCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 20, 
    flexDirection: 'row', alignItems: 'center', gap: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#ccfbf1',
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 24, fontWeight: '800', color: '#1f2937' },
  phone: { fontSize: 18, color: '#4b5563', marginTop: 4 },
  subtext: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#4b5563', marginTop: 8, marginLeft: 8 },
  
  settingsGroup: {
    backgroundColor: 'white', borderRadius: 20, overflow: 'hidden',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
  },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16,
  },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 20 },
  iconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 18, fontWeight: '700', color: '#1f2937', flex: 1 },
  settingSub: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  
  editText: { fontSize: 16, fontWeight: '700', color: '#0d9488' },
  sosNumberText: { fontSize: 24, fontWeight: '800', color: '#ef4444', marginTop: 12, marginLeft: 68 },
  sosEditBox: { flexDirection: 'row', gap: 12, marginTop: 16, marginLeft: 68 },
  sosInput: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 16, fontSize: 18 },
  sosSaveBtn: { backgroundColor: '#0d9488', borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' },
  sosSaveText: { color: 'white', fontWeight: '700', fontSize: 16 },
  
  logoutBtn: {
    backgroundColor: '#fef2f2', borderWidth: 2, borderColor: '#fecaca',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingVertical: 20, borderRadius: 20, marginTop: 16,
  },
  logoutText: { fontSize: 20, fontWeight: '800', color: '#ef4444' },
});

