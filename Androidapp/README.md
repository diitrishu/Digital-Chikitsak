# Digital Chikitsak - Patient App (React Native Expo)

The Digital Chikitsak Android Application is an **Elder-Friendly**, **Offline-First**, and **Voice-Enabled** mobile health platform engineered specifically for rural Indian users (Age 50+). 

This README provides a comprehensive technical and functional overview of **what** the app does and **how** it is implemented under the hood.

---

## 1. Elder-Friendly UI Architecture

### What it does:
The app replaces standard mobile UI patterns with a simplified, high-contrast, and large-format design system. Everything is designed to be readable, touchable, and understandable by users with poor vision, motor tremors, or low tech-literacy, blending simple Hindi and English.

### How it works:
- **Massive Touch Targets:** Standard padding and margins are doubled. Minimum button padding is `paddingVertical: 20` using Tailwind (`NativeWind`). Button sizes are at least 64px by 64px.
- **Typography & Colors:** High contrast colors (Tailwind `teal-500`, `red-500`, `amber-500`) are used alongside bold `fontWeight: '800'` to ensure text stands out against the `gray-50` background.
- **Icons & Affordances:** React Native Vector Icons (`@expo/vector-icons/Ionicons`) are used at large sizes (32px+) instead of text where possible to create recognizable visual anchors.

---

## 2. Voice-First Interaction (The "Paytm Soundbox" Experience)

### What it does:
Illiterate or visually impaired users can navigate the app using their voice and receive spoken auditory feedback. A floating microphone button is available persistently on all screens. If the AI detects symptoms, provides a queue number, or successfully logs the user in, it speaks the status out loud in Hindi.

### How it works:
- **`voiceService.js`:** Utilizes `expo-speech` to synthesize Text-to-Speech (TTS) automatically.
- **`FloatingVoiceButton.js`:** Rendered *outside* the `AppNavigator` in `App.js`. This ensures the button floats above all screens utilizing `position: 'absolute'`.
- **Command Parsing:** Voice transcriptions (mocked via keyboard input due to emulator constraints) are processed using simple keyword matching in `voiceService.js` (e.g., matching "dawai" to navigate to `RemindersScreen`). 
- **`navigationRef.js`:** Exposes the React Navigation container ref globally so the voice service can forcefully navigate the user without needing React Context.

---

## 3. Offline-First Resilience & Sync Engine

### What it does:
Rural areas often suffer from `E` or `H+` network dropouts. If a user tries to create a medication reminder while offline, the app handles it gracefully, saves the action locally, and syncs it to the cloud when the internet returns.

### How it works:
- **Zustand Persistence:** `useNetworkStore.js` uses Zustand combined with `@react-native-async-storage/async-storage` to create a persistent local cache and outbox queue.
- **`OfflineBanner.js`:** Subscribes to `@react-native-community/netinfo` to instantly display a red warning banner if the device loses connection.
- **`networkService.js`:** A background polling mechanism runs when the app is active. When `NetInfo` confirms a connection is re-established, the queue is mapped over and pending API calls (like `POST /api/reminders`) are finally dispatched.

---

## 4. One-Tap Emergency SOS

### What it does:
A life-saving feature allowing a senior citizen to get immediate help. By pressing a massive red button on the Dashboard, the app initiates a 5-second countdown. If not canceled, it dials emergency services (112) and sends SMS alerts with their exact Google Maps location to a pre-defined relative.

### How it works:
- **`sosService.js`:** 
  1. Requests `expo-location` permissions and fetches high-accuracy GPS coordinates (`Location.getCurrentPositionAsync`).
  2. Constructs a Google Maps URL containing the latitude and longitude.
  3. Uses `expo-linking` (`Linking.openURL('tel:112')`) to dial emergency services.
  4. (Future Implementation) Uses `expo-sms` to silently send the payload to the saved emergency contact stored in AsyncStorage.

---

## 5. Frictionless Biometric Authentication

### What it does:
Logouts or session timeouts are frustrating for the elderly. The app allows users to completely bypass PIN entering by utilizing hardware biometrics (Fingerprint or Face ID) automatically when they open the app.

### How it works:
- **`biometricService.js`:** Leverages `expo-local-authentication`. 
  - `hasHardwareAsync()` verifies device capability.
  - `authenticateAsync()` triggers the native biometric prompt.
- **Persistence:** Upon their first successful PIN login, `AsyncStorage` caches their `phone` and `pin` (encrypted ideally, though plain in this POC). Subsequence app launches read this cache, trigger the biometric prompt, and auto-submit the form if the scan matches.

---

## 6. AI Triage & Real-Time Queueing

### What it does:
The user describes their symptoms (e.g., "Mera pet dard aur bukhar hai"). A machine-learning model predicts the disease. A triage engine routes them to the correct doctor type (e.g., Gastroenterologist), and they enter a live waiting room.

### How it works:
- **Triage Pipeline:** `triage.js` applies heuristic rules matching user keywords to specializations and assigns priority (Emergency, Senior, Child, General).
- **Python ML Backend:** `api.py` sends a JSON payload to a Flask API serving a `RandomForestClassifier` trained on Medical symptoms to return predictions.
- **Real-Time Supabase:** `useQueue.js` binds to Supabase's Realtime PostgreSQL websockets (`supabase.channel('queue')`). When a doctor marks a patient as "Done", the local `useQueueStore` instantly updates the patient's position and estimated wait time without needing manual refresh pulls.
- **Video Calling:** When it's the user's turn, the app auto-directs them to a secure `Jitsi Meet` room (`https://meet.jit.si/<custom-hash>`) via `expo-linking`.

---

## 7. Local Push Notifications (Medication Alerts)

### What it does:
Tells the user when to take their meds ("Dawai Yaad"). Alerts pop up at the exact scheduled local time without needing cloud internet servers to trigger them.

### How it works:
- **`expo-notifications`:** `notificationService.js` requests user permission to display alerts.
- **Local Triggers:** `Notifications.scheduleNotificationAsync` determines the exact hour and minute, sending a system-level Android Notification payload consisting of the medication name and an auditory alarm. 

---

## 8. PDF Export (Health Report Consolidation)

### What it does:
The elderly often need physical papers to show doctors at rural primary health centers. This feature collects their uploaded test results, AI triage history, and current medications, formats them nicely, and generates a printable PDF.

### How it works:
- **`exportService.js`:** Utilizes `expo-print` internally. It constructs raw HTML/CSS strings injecting the user's Supabase records via template literals.
- **`expo-sharing`:** Once the local `.pdf` file is written to device storage, it triggers the native Android Sharing Intent sheet, allowing the user to send the document natively to WhatsApp or a Bluetooth Printer.

---

## Getting Started

1. **Install Dependencies:** `npm install`
2. **Environment Configuration (`.env`):**
   ```env
   EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:5000/api
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. **Start Expo Server:** `npx expo start --clear`
4. **Deploy:** `eas build -p android --profile preview`
