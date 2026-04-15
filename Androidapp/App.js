import './global.css';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AppNavigator from 'src/navigation/AppNavigator';
import { useAuthStore } from 'src/store/useAuthStore';
import ErrorBoundary from 'src/components/ErrorBoundary';
import OfflineBanner from 'src/components/OfflineBanner';
import FloatingVoiceButton from 'src/components/FloatingVoiceButton';
import { startNetworkListener, stopNetworkListener } from 'src/services/networkService';
import { navigationRef } from 'src/navigation/navigationRef';
import { setupOfflineSync } from 'src/services/offlineQueue';
export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
    setupOfflineSync();
    startNetworkListener();
    return () => {
      stopNetworkListener();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <OfflineBanner />
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
          <FloatingVoiceButton />
        </NavigationContainer>
        <Toast />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
