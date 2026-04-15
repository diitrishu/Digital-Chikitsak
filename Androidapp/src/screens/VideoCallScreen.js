import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function VideoCallScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { jitsiRoom, doctorName } = route.params || {};

  if (!jitsiRoom) {
    navigation.goBack();
    return null;
  }

  const jitsiUrl = `https://meet.jit.si/${jitsiRoom}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Consultation: {doctorName || 'Doctor'}</Text>
        <TouchableOpacity style={styles.endBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.endBtnText}>End Call</Text>
        </TouchableOpacity>
      </View>
      <WebView
        source={{ uri: jitsiUrl }}
        style={styles.webview}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        // Allow camera and microphone permissions
        mediaCapturePermissionGrantType="grant"
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error:', nativeEvent);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1e293b', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 12 },
  headerText: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },
  endBtn: { backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  endBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  webview: { flex: 1 },
});
