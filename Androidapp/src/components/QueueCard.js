import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const PRIORITY_CONFIG = {
  emergency: { label: 'Emergency', bg: '#fee2e2', text: '#b91c1c', dotColor: '#ef4444' },
  senior:    { label: 'Senior',    bg: '#ffedd5', text: '#c2410c', dotColor: '#f97316' },
  child:     { label: 'Child',     bg: '#dbeafe', text: '#1d4ed8', dotColor: '#3b82f6' },
  general:   { label: 'General',   bg: '#dcfce7', text: '#15803d', dotColor: '#22c55e' },
};

export default function QueueCard({ token, myPosition, estimatedWait, isMyTurn, jitsiRoomId, channelStatus, onRefresh }) {
  const navigation = useNavigation();
  const pc = PRIORITY_CONFIG[token?.priority] || PRIORITY_CONFIG.general;
  const isLive = channelStatus === 'SUBSCRIBED';

  if (isMyTurn && (jitsiRoomId || token?.jitsi_room)) {
    return (
      <View style={styles.turnCard}>
        <Text style={styles.turnEmoji}>🎉</Text>
        <Text style={styles.turnTitle}>It's Your Turn!</Text>
        <Text style={styles.turnSubtitle}>Your doctor is ready</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('VideoCall', {
            jitsiRoom: jitsiRoomId || token?.jitsi_room,
            doctorName: token?.doctors?.name || 'Doctor',
          })}
          style={styles.joinBtn}
        >
          <Ionicons name="videocam" size={18} color="#16a34a" />
          <Text style={styles.joinBtnText}>Join Video Call</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Connection status */}
      <View style={[styles.statusBadge, { backgroundColor: isLive ? '#f0fdf4' : '#fefce8' }]}>
        <Ionicons
          name={isLive ? 'wifi' : 'wifi-outline'}
          size={12}
          color={isLive ? '#16a34a' : '#ca8a04'}
        />
        <Text style={[styles.statusText, { color: isLive ? '#16a34a' : '#ca8a04' }]}>
          {isLive ? 'Live updates' : 'Reconnecting…'}
        </Text>
      </View>

      {/* Token number */}
      <View style={styles.tokenRow}>
        <View>
          <Text style={styles.tokenLabel}>Token Number</Text>
          <Text style={styles.tokenNumber}>#{token?.token_number}</Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: pc.bg }]}>
          <Text style={[styles.priorityText, { color: pc.text }]}>{pc.label}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="people" size={18} color="#9ca3af" />
          <Text style={styles.statNumber}>{myPosition}</Text>
          <Text style={styles.statLabel}>ahead of you</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="time" size={18} color="#9ca3af" />
          <Text style={styles.statNumber}>{estimatedWait}</Text>
          <Text style={styles.statLabel}>min wait</Text>
        </View>
      </View>

      {myPosition === 0 && (
        <View style={styles.nextAlert}>
          <Text style={styles.nextAlertText}>⚡ You're next! Please be ready.</Text>
        </View>
      )}

      <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
        <Ionicons name="refresh" size={12} color="#9ca3af" />
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // "It's your turn" card
  turnCard: { backgroundColor: '#22c55e', borderRadius: 16, padding: 20, alignItems: 'center' },
  turnEmoji: { fontSize: 32, marginBottom: 8 },
  turnTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  turnSubtitle: { color: '#dcfce7', fontSize: 14, marginTop: 4, marginBottom: 16 },
  joinBtn: {
    backgroundColor: '#ffffff', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  joinBtnText: { color: '#16a34a', fontWeight: 'bold', fontSize: 15 },

  // Waiting card
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, borderColor: '#f3f4f6',
    borderWidth: 1, padding: 20,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, marginBottom: 16,
  },
  statusText: { fontSize: 12 },
  tokenRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  tokenLabel: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 },
  tokenNumber: { fontSize: 48, fontWeight: '900', color: '#0d9488' },
  priorityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  priorityText: { fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 12,
    padding: 12, alignItems: 'center',
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginTop: 4 },
  statLabel: { fontSize: 12, color: '#9ca3af' },
  nextAlert: {
    marginTop: 12, backgroundColor: '#fefce8', borderColor: '#fde68a',
    borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center',
  },
  nextAlertText: { color: '#92400e', fontSize: 14, fontWeight: '500' },
  refreshBtn: {
    marginTop: 12, paddingVertical: 8, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  refreshText: { fontSize: 12, color: '#9ca3af' },
});
