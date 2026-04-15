// services/voiceService.js
let ExpoSpeechRecognitionModule = null;
try {
  ExpoSpeechRecognitionModule = require('@jamsch/expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch (e) {
  console.log('STT native module unavailable');
}
import * as Speech from 'expo-speech';

// ---- Symptom keyword map (same 20 symptoms as backend api.py) ----
const SYMPTOM_KEYWORDS = {
  'hi-IN': {
    fever: ['bukhaar', 'bukhar', 'tez bukhaar', 'bokhaar', 'garmi'],
    headache: ['sar dard', 'sir dard', 'sar mein dard'],
    fatigue: ['kamzori', 'thakan', 'thaka hua', 'bimaar'],
    dizziness: ['chakkar', 'chakker', 'sar ghoomna'],
    cough: ['khansi', 'khaansi', 'khas'],
    shortness_breath: ['saans', 'saans lene mein takleef', 'dam ghutna'],
    sore_throat: ['gala dard', 'gale mein dard', 'gala kharab'],
    runny_nose: ['naak bahna', 'chheenk', 'nazla'],
    nausea: ['ulti jaisi', 'ji machlana', 'matli'],
    vomiting: ['ulti', 'ultee', 'qay'],
    stomach_pain: ['pet dard', 'pait dard', 'peth dard'],
    diarrhea: ['dast', 'loose motion', 'patlaa potty'],
    joint_pain: ['jodo mein dard', 'jod dard'],
    muscle_pain: ['badan dard', 'body dard', 'maaaspeshan'],
    back_pain: ['kamar dard', 'peeth dard'],
    swelling: ['sujan', 'soojan'],
    rash: ['daane', 'kharish'],
    itching: ['kharish', 'khujli'],
    dry_skin: ['rookhi twacha', 'dry skin'],
    wounds: ['ghav', 'chot', 'zakhm', 'khoon']
  },
  'pa-IN': {
    fever: ['bukhar', 'tapp', 'garmi'],
    headache: ['sir dard', 'sar dard'],
    fatigue: ['kamzori', 'thakaan'],
    dizziness: ['chakkar'],
    cough: ['khansi', 'khaasi'],
    shortness_breath: ['sah lena', 'sans di takleef'],
    sore_throat: ['gala dard', 'gale di takleef'],
    runny_nose: ['naak bahna'],
    nausea: ['ulti jaisi', 'ji machlana'],
    vomiting: ['ulti', 'kaa'],
    stomach_pain: ['pet dard', 'dhabaa dard'],
    diarrhea: ['dast', 'loose motion'],
    joint_pain: ['jod dard'],
    muscle_pain: ['body dard', 'badan dard'],
    back_pain: ['kamar dard', 'peeth dard'],
    swelling: ['sujan'],
    rash: ['daane', 'kharash'],
    itching: ['khujli', 'kharish'],
    dry_skin: ['sukkhi twacha'],
    wounds: ['ghav', 'chot']
  },
  'en-IN': {
    fever: ['fever', 'temperature', 'hot', 'burning'],
    headache: ['headache', 'head pain', 'migraine'],
    fatigue: ['tired', 'fatigue', 'weakness', 'weak'],
    dizziness: ['dizzy', 'dizziness', 'vertigo'],
    cough: ['cough', 'coughing'],
    shortness_breath: ['breath', 'breathing', 'breathless', 'cant breathe'],
    sore_throat: ['throat', 'sore throat'],
    runny_nose: ['runny nose', 'sneezing', 'nasal'],
    nausea: ['nausea', 'nauseous'],
    vomiting: ['vomiting', 'vomit', 'throwing up'],
    stomach_pain: ['stomach', 'stomach pain', 'abdomen', 'belly'],
    diarrhea: ['diarrhea', 'loose motion', 'loose stool'],
    joint_pain: ['joint pain', 'joints'],
    muscle_pain: ['muscle pain', 'body pain', 'body ache'],
    back_pain: ['back pain', 'back ache'],
    swelling: ['swelling', 'swollen'],
    rash: ['rash', 'skin rash'],
    itching: ['itch', 'itching'],
    dry_skin: ['dry skin'],
    wounds: ['wound', 'cut', 'injury', 'bleeding']
  }
};

const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'unconscious', 'cant breathe',
  'severe bleeding', 'seizure', 'fitting',
  'sine dard', 'dil ka dauraa', 'behoshi', 'zyaada khoon',
  'seene mein dard', 'hosh nahi'
];

export function parseTranscript(transcript, lang = 'hi-IN') {
  const lower = transcript.toLowerCase();
  const keywords = SYMPTOM_KEYWORDS[lang] || SYMPTOM_KEYWORDS['en-IN'];
  const allSymptoms = Object.keys(SYMPTOM_KEYWORDS['en-IN']);
  const result = {};
  allSymptoms.forEach(s => { result[s] = 0; });
  Object.entries(keywords).forEach(([symptom, words]) => {
    if (words.some(word => lower.includes(word))) result[symptom] = 1;
  });
  return result;
}

export function isEmergency(transcript) {
  const lower = transcript.toLowerCase();
  return EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));
}

// Text-to-speech feedback (uses expo-speech)
export async function speak(text, lang = 'hi-IN') {
  const langMap = { 'hi-IN': 'hi', 'pa-IN': 'pa', 'en-IN': 'en' };
  try {
    await Speech.speak(text, {
      language: langMap[lang] || 'hi',
      pitch: 1.0,
      rate: 0.9
    });
  } catch (err) {
    console.warn('TTS error:', err);
  }
}

// Navigation command parser (for FloatingVoiceButton)
const NAV_COMMANDS = {
  'hi-IN': {
    home: ['home', 'ghar', 'dashboard'],
    reminders: ['dawai', 'reminder', 'yaad', 'medicine'],
    queue: ['token', 'doctor', 'queue', 'antaar'],
    pharmacy: ['pharmacy', 'dawai ki dukan', 'chemist'],
    records: ['record', 'report', 'history'],
  }
};

export function parseNavCommand(transcript, lang = 'hi-IN') {
  const lower = transcript.toLowerCase();
  const commands = NAV_COMMANDS[lang] || NAV_COMMANDS['hi-IN'];
  for (const [screen, keywords] of Object.entries(commands)) {
    if (keywords.some(kw => lower.includes(kw))) return screen;
  }
  return null;
}

// ---- Request permissions ----
export async function requestPermissions() {
  const result = await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
  return result.granted;
}

// ---- Check if STT is available ----
export function isSTTAvailable() {
  return ExpoSpeechRecognitionModule.isRecognitionAvailable();
}
