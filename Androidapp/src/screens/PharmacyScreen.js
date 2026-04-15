import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from 'src/services/api';
import LoadingSpinner from 'src/components/LoadingSpinner';

export default function PharmacyScreen() {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getPharmacies();
        setPharmacies(data.pharmacies || data || []);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner message="Finding pharmacies..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Nearby Pharmacies</Text>
        <Text style={styles.subtitle}>Find generic medicine stock near you</Text>

        {pharmacies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="medkit" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No pharmacies found</Text>
          </View>
        ) : (
          pharmacies.map((p, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.icon}>
                  <Ionicons name="medkit" size={20} color="#22c55e" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.pharmName}>{p.name || p.pharmacy_name}</Text>
                  <Text style={styles.pharmAddress}>{p.address || 'Address not available'}</Text>
                  {p.distance && <Text style={styles.pharmDist}>{p.distance} km away</Text>}
                </View>
                {p.is_open !== undefined && (
                  <View style={[styles.badge, p.is_open ? styles.badgeOpen : styles.badgeClosed]}>
                    <Text style={[styles.badgeText, p.is_open ? styles.badgeTextOpen : styles.badgeTextClosed]}>
                      {p.is_open ? 'Open' : 'Closed'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flex: 1, paddingHorizontal: 16, paddingVertical: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  subtitle: { color: '#9ca3af', fontSize: 14, marginBottom: 20 },
  emptyContainer: { alignItems: 'center', paddingVertical: 64 },
  emptyText: { color: '#9ca3af', marginTop: 12, fontSize: 14 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, borderColor: '#f3f4f6',
    borderWidth: 1, padding: 16, marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: {
    width: 40, height: 40, backgroundColor: '#dcfce7', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cardInfo: { flex: 1 },
  pharmName: { fontWeight: '600', color: '#1f2937', fontSize: 15 },
  pharmAddress: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  pharmDist: { fontSize: 12, color: '#0d9488', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeOpen: { backgroundColor: '#dcfce7' },
  badgeClosed: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 12, fontWeight: '500' },
  badgeTextOpen: { color: '#15803d' },
  badgeTextClosed: { color: '#dc2626' },
});
