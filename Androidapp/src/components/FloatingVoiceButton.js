import React, { useState, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import VoiceModal from 'src/components/VoiceModal';

export default function FloatingVoiceButton() {
  const [showModal, setShowModal] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    setShowModal(true);
  };

  return (
    <>
      <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
        {/* Outer glow ring */}
        <View style={styles.glowRing} />
        <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.85}>
          <Ionicons name="mic" size={30} color="white" />
        </TouchableOpacity>
      </Animated.View>

      <VoiceModal visible={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 62, // Just above tab bar
    alignSelf: 'center',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(13,148,136,0.2)',
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#0d9488',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
});
