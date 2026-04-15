import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { getCurrentUser } from '../../shared/services/auth';
import { Settings, User, Bell, Shield, Smartphone, Globe, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const { t, currentLanguage, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: false,
    smsNotifications: true,
    darkMode: false,
    language: currentLanguage,
    medicationReminders: true,
    appointmentReminders: true,
    lowBandwidthMode: false,
    autoBackup: true
  });

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setUserData(user);
    }
    
    // Load settings from API
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (!token) return;
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/settings`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try { setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) })); } catch {}
    }
  };

  const handleSettingChange = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (token) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        await fetch(`${apiUrl}/settings`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: newSettings })
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
    
    // Handle specific settings
    if (key === 'language' && value !== currentLanguage) {
      changeLanguage(value);
      toast.success('Language changed successfully!');
    }
    
    if (key === 'lowBandwidthMode') {
      localStorage.setItem('lowBandwidthMode', value.toString());
      toast.success(`Low bandwidth mode ${value ? 'enabled' : 'disabled'}`);
    }
    
    if (key === 'notifications') {
      toast.success(`Notifications ${value ? 'enabled' : 'disabled'}`);
    }
  };

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' }
  ];

  return (
    <AppShell title="Settings">
      <div className="max-w-4xl mx-auto px-4 py-5">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                <Settings size={32} />
                {t('settings.title')}
              </h1>
              <p className="text-gray-600">
                {t('settings.subtitle')}
              </p>
            </div>

            {/* Profile Settings */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <User size={20} />
                {t('settings.profileSettings')}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settings.name')}
                  </label>
                  <input
                    type="text"
                    value={userData?.name || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settings.phoneNumber')}
                  </label>
                  <input
                    type="text"
                    value={userData?.phone || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settings.role')}
                  </label>
                  <input
                    type="text"
                    value={userData?.role || t('auth.patient')}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Language Settings */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Globe size={20} />
                {t('settings.languageSettings')}
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.selectLanguage')}
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Bell size={20} />
                {t('settings.notificationSettings')}
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      {t('settings.pushNotifications')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('settings.pushNotificationsDesc')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications}
                      onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      {t('settings.medicationReminders')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('settings.medicationRemindersDesc')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.medicationReminders}
                      onChange={(e) => handleSettingChange('medicationReminders', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      {t('settings.appointmentReminders')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('settings.appointmentRemindersDesc')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.appointmentReminders}
                      onChange={(e) => handleSettingChange('appointmentReminders', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* App Settings */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Smartphone size={20} />
                {t('settings.appSettings')}
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      {t('settings.lowBandwidthMode')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('settings.lowBandwidthModeDesc')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.lowBandwidthMode}
                      onChange={(e) => handleSettingChange('lowBandwidthMode', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      {t('settings.autoBackup')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('settings.autoBackupDesc')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoBackup}
                      onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Privacy & Security */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Shield size={20} />
                {t('settings.privacySecurity')}
              </h2>
              
              <div className="space-y-4">
                <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <h3 className="font-medium text-gray-800">
                    {t('settings.changePin')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('settings.changePinDesc')}
                  </p>
                </button>
                
                <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <h3 className="font-medium text-gray-800">
                    {t('settings.privacyPolicy')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('settings.privacyPolicyDesc')}
                  </p>
                </button>
                
                <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <h3 className="font-medium text-gray-800">
                    {t('settings.exportData')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('settings.exportDataDesc')}
                  </p>
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
              <h2 className="text-xl font-semibold mb-4 text-red-600">
                {t('settings.dangerZone')}
              </h2>
              
              <div className="space-y-4">
                <button className="w-full text-left p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                  <h3 className="font-medium text-red-800">
                    {t('settings.deleteAccount')}
                  </h3>
                  <p className="text-sm text-red-600">
                    {t('settings.deleteAccountDesc')}
                  </p>
                </button>
              </div>
            </div>
          </div>
        </AppShell>
  );
};

export default SettingsPage;
