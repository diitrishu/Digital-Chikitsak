import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const QUICK_SYMPTOMS = [
  { key: 'fever', label: 'Fever', emoji: '🌡️' },
  { key: 'cough', label: 'Cough', emoji: '😮‍💨' },
  { key: 'headache', label: 'Headache', emoji: '🤕' },
  { key: 'stomach_pain', label: 'Stomach Pain', emoji: '🤢' },
  { key: 'fatigue', label: 'Fatigue', emoji: '😴' },
  { key: 'shortness_breath', label: 'Breathlessness', emoji: '😮' },
  { key: 'sore_throat', label: 'Sore Throat', emoji: '🤒' },
  { key: 'joint_pain', label: 'Joint Pain', emoji: '🦴' },
  { key: 'rash', label: 'Rash', emoji: '🔴' },
  { key: 'diarrhea', label: 'Diarrhea', emoji: '🚽' },
  { key: 'vomiting', label: 'Vomiting', emoji: '🤮' },
  { key: 'chest_pain', label: 'Chest Pain', emoji: '💔' },
];

export default function SymptomChips({ selected = [], onToggle }) {
  return (
    <View>
      <Text style={styles.heading}>Quick Select</Text>
      <View style={styles.chipsRow}>
        {QUICK_SYMPTOMS.map(({ key, label, emoji }) => {
          const active = selected.includes(key);
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onToggle(key)}
              style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
            >
              <Text>{emoji}</Text>
              <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export { QUICK_SYMPTOMS };

const styles = StyleSheet.create({
  heading: {
    fontSize: 12, fontWeight: '600', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  chipActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  chipInactive: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  chipText: { fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: '#ffffff' },
  chipTextInactive: { color: '#4b5563' },
});
