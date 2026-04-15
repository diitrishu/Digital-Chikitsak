import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Speech from 'expo-speech';

// Configure how notifications look when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermission() {
  if (!Device.isDevice) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Schedule a medication reminder at a specific time each day
export async function scheduleMedicationReminder({ id, medicineName, time, days = [] }) {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});

  // Parse time like "08:30"
  const [hour, minute] = time.split(':').map(Number);

  const trigger = days.length > 0
    ? { type: 'weekly', weekday: days[0], hour, minute, second: 0 }
    : { type: 'daily', hour, minute, second: 0 };

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: '💊 Dawai Lene Ka Time!',
      body: `${medicineName} lena mat bhulen`,
      sound: true,
      data: { type: 'medication', id },
    },
    trigger,
  });
}

export async function cancelReminder(id) {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

// Send an immediate notification + speak it
export async function sendQueueTurnNotification(tokenNumber) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🏥 Aapki Baari Aa Gayi!',
      body: `Token #${tokenNumber} — Doctor ke paas jaiye`,
      sound: true,
    },
    trigger: null, // immediate
  });

  Speech.speak(`Aapka number aa gaya hai. Token number ${tokenNumber}. Doctor ke paas chaliye.`, {
    language: 'hi-IN',
    rate: 0.85,
  });
}

export async function sendDoctorOnlineNotification(doctorName) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '👨‍⚕️ Doctor Online Hai!',
      body: `${doctorName} ab available hain. Consult karo.`,
      sound: true,
    },
    trigger: null,
  });
}
