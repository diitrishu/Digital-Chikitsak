import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

const ARTICLES = [
  {
    id: '1', emoji: '💧', category: 'Swasthya',
    title: 'Roz 8 gilas paani piyein',
    body: 'Zyada paani peene se pet saaf rehta hai, thakaan kam hoti hai, aur skin acchi rehti hai. Subah uthke ek gilas garam paani zarur piyein.',
    color: '#dbeafe', accent: '#1d4ed8',
  },
  {
    id: '2', emoji: '🚶', category: 'Kasrat',
    title: 'Roz 30 minute chalein',
    body: 'Roz aadha ghante chalne se dil mazboot hota hai, sugar control rehti hai, aur neend achhi aati hai. Subah ya shaam chalna shuru karein.',
    color: '#dcfce7', accent: '#15803d',
  },
  {
    id: '3', emoji: '🍎', category: 'Khaana',
    title: 'Sehat wala khaana khaiye',
    body: 'Hare patte ki sabzi, dal, chawal, aur seasonal phal khana sehat ke liye bahut zaroori hai. Tala hua aur meetha kam khaiye.',
    color: '#fef3c7', accent: '#b45309',
  },
  {
    id: '4', emoji: '😴', category: 'Neend',
    title: '7-8 ghante ki neend lein',
    body: 'Poori neend lene se dimag fresh rehta hai, BP normal rehta hai, aur bimari se ladne ki shakti badhti hai.',
    color: '#f3e8ff', accent: '#7c3aed',
  },
  {
    id: '5', emoji: '🩺', category: 'Jaanch',
    title: 'Saal mein ek baar doctor se milein',
    body: 'Bhale hi aap theek ho, saal mein ek baar regular checkup zarur karwaiye. Isse bimari jaldi pakdi jaati hai.',
    color: '#fce7f3', accent: '#be185d',
  },
  {
    id: '6', emoji: '🧘', category: 'Mann ki Shanti',
    title: 'Roz 10 minute meditation karein',
    body: 'Dhyan lagane se tension, chinta, aur gussa kam hota hai. Simple tarah — aankhein band karein, gehri saans lein, aur ek jagah baith jaiye.',
    color: '#ccfbf1', accent: '#0d9488',
  },
  {
    id: '7', emoji: '🚭', category: 'Buri Aadat',
    title: 'Beedi ya cigarette band karein',
    body: 'Tambaakhu se cancer, dil ki bimari, aur saanson ki takleef hoti hai. Agar band karna ho toh doctor se madad maangein.',
    color: '#fee2e2', accent: '#dc2626',
  },
  {
    id: '8', emoji: '💊', category: 'Dawai',
    title: 'Doctor ki dawai poori khayein',
    body: 'Aksar log jab theek lagta hai toh dawai band kar dete hain. Yeh galat hai — doctor ne jo course bataya hai woh poora karein.',
    color: '#e0e7ff', accent: '#4f46e5',
  },
];

const CATEGORIES = ['Sabhi', 'Swasthya', 'Kasrat', 'Khaana', 'Neend', 'Jaanch', 'Mann ki Shanti', 'Buri Aadat', 'Dawai'];

export default function HealthEducationScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState('Sabhi');
  const [speakingId, setSpeakingId] = useState(null);

  const filtered = selectedCategory === 'Sabhi'
    ? ARTICLES
    : ARTICLES.filter((a) => a.category === selectedCategory);

  const handleSpeak = async (article) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (speakingId === article.id) {
      Speech.stop();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(article.id);
    Speech.speak(`${article.title}. ${article.body}`, {
      language: 'hi-IN', rate: 0.8,
      onDone: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0d9488" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sehat ki Jaankari 📚</Text>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
          >
            <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }}>
        {filtered.map((article) => (
          <View key={article.id} style={[styles.card, { backgroundColor: article.color }]}>
            <View style={styles.cardTop}>
              <Text style={styles.emoji}>{article.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.catLabel, { color: article.accent }]}>{article.category}</Text>
                <Text style={styles.articleTitle}>{article.title}</Text>
              </View>
              {/* Speak button */}
              <TouchableOpacity
                style={[styles.speakBtn, { backgroundColor: article.accent }]}
                onPress={() => handleSpeak(article)}
              >
                <Ionicons name={speakingId === article.id ? 'stop' : 'volume-high'} size={20} color="white" />
              </TouchableOpacity>
            </View>
            <Text style={styles.articleBody}>{article.body}</Text>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  catScroll: { marginBottom: 12 },
  catChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'white', borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  catChipActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  catChipText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  catChipTextActive: { color: 'white' },
  card: { margin: 12, marginBottom: 4, borderRadius: 20, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  emoji: { fontSize: 36 },
  catLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  articleTitle: { fontSize: 18, fontWeight: '800', color: '#1f2937', marginTop: 2 },
  articleBody: { fontSize: 16, color: '#374151', lineHeight: 26 },
  speakBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
