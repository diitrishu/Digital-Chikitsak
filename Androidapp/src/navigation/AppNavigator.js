import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from 'src/store/useAuthStore';
import LoadingSpinner from 'src/components/LoadingSpinner';

// Screens
import LoginScreen from 'src/screens/LoginScreen';
import RegisterScreen from 'src/screens/RegisterScreen';
import DashboardScreen from 'src/screens/DashboardScreen';
import SymptomCheckerScreen from 'src/screens/SymptomCheckerScreen';
import ChatListScreen from 'src/screens/ChatListScreen';
import ChatScreen from 'src/screens/ChatScreen';
import SettingsScreen from 'src/screens/SettingsScreen';
import HealthRecordsScreen from 'src/screens/HealthRecordsScreen';
import PharmacyScreen from 'src/screens/PharmacyScreen';
import RemindersScreen from 'src/screens/RemindersScreen';
import BookDoctorScreen from 'src/screens/BookDoctorScreen';
import FamilyScreen from 'src/screens/FamilyScreen';
import HealthEducationScreen from 'src/screens/HealthEducationScreen';
import TokenStatusScreen from 'src/screens/TokenStatusScreen';
import SOSScreen from 'src/screens/SOSScreen';
import VoiceOnboardingScreen from 'src/screens/VoiceOnboardingScreen';
import VideoCallScreen from 'src/screens/VideoCallScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#14b8a6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#f3f4f6',
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          let name;
          switch (route.name) {
            case 'Home': name = 'home'; break;
            case 'Consult': name = 'fitness'; break;
            case 'Messages': name = 'chatbubbles'; break;
            case 'Profile': name = 'person-circle'; break;
            default: name = 'apps'; break;
          }
          return <Ionicons name={name} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Consult" component={SymptomCheckerScreen} />
      <Tab.Screen name="Messages" component={ChatListScreen} />
      <Tab.Screen name="Profile" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return <LoadingSpinner message="Loading..." />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="VoiceOnboarding" component={VoiceOnboardingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="SymptomChecker" component={SymptomCheckerScreen}
            options={{ headerShown: true, headerTitle: 'Symptom Checker', headerTintColor: '#0d9488' }} />
          <Stack.Screen name="Chat" component={ChatScreen}
            options={({ route }) => ({ headerShown: true, headerTitle: route.params?.doctorName || 'Chat', headerTintColor: '#0d9488' })} />
          <Stack.Screen name="HealthRecords" component={HealthRecordsScreen}
            options={{ headerShown: true, headerTitle: 'Health Records', headerTintColor: '#0d9488' }} />
          <Stack.Screen name="Pharmacy" component={PharmacyScreen}
            options={{ headerShown: true, headerTitle: 'Pharmacies', headerTintColor: '#0d9488' }} />
          <Stack.Screen name="Reminders" component={RemindersScreen}
            options={{ headerShown: true, headerTitle: 'Reminders', headerTintColor: '#0d9488' }} />
          <Stack.Screen name="ChatList" component={ChatListScreen}
            options={{ headerShown: true, headerTitle: 'Messages', headerTintColor: '#0d9488' }} />
          <Stack.Screen name="BookDoctor" component={BookDoctorScreen} />
          <Stack.Screen name="Family" component={FamilyScreen} />
          <Stack.Screen name="HealthEducation" component={HealthEducationScreen} />
          <Stack.Screen name="TokenStatus" component={TokenStatusScreen} />
          <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SOS" component={SOSScreen} options={{ presentation: 'fullScreenModal' }}/>
        </>
      )}
    </Stack.Navigator>
  );
}
