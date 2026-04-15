import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStore } from 'src/store/useNetworkStore';

export default function OfflineBanner() {
  const isConnected = useNetworkStore((s) => s.isConnected);
  const isSyncing = useNetworkStore((s) => s.syncQueue?.length > 0);
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const [visible, setVisible] = useState(false);
  const [showOnline, setShowOnline] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      setVisible(true);
      setShowOnline(false);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
    } else {
      if (visible) {
        // Was offline, now online — show green briefly
        setShowOnline(true);
        setTimeout(() => {
          Animated.timing(slideAnim, { toValue: -60, duration: 400, useNativeDriver: true }).start(() => {
            setVisible(false);
            setShowOnline(false);
          });
        }, 2500);
      }
    }
  }, [isConnected]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: showOnline ? '#22c55e' : '#f97316',
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Ionicons
        name={showOnline ? 'checkmark-circle' : 'wifi-outline'}
        size={18}
        color="white"
      />
      <Text style={{ color: 'white', fontWeight: '700', fontSize: 14, flex: 1 }}>
        {showOnline
          ? '✅ Wapas online! Data sync ho raha hai…'
          : `📵 Internet nahi hai — aapka data safe hai${isSyncing ? ' (sync pending)' : ''}`}
      </Text>
    </Animated.View>
  );
}
