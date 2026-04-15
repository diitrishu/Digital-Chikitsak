import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../shared/contexts/LanguageContext'; // Use custom language context instead
import { Zap, Image, Video, Download, Settings } from 'lucide-react';

const LowBandwidthMode = ({ isActive, onToggle }) => {
  const { t } = useLanguage(); // Use custom hook instead of useTranslation
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    disableImages: true,
    disableVideos: true,
    reduceQuality: true,
    limitData: true
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('lowBandwidthSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  useEffect(() => {
    // Save settings to localStorage
    localStorage.setItem('lowBandwidthSettings', JSON.stringify(settings));
  }, [settings]);

  const toggleSetting = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  if (!isActive) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="text-yellow-600" size={20} />
            <h3 className="font-semibold text-yellow-800">
              {t('lowBandwidth.title')}
            </h3>
          </div>
          <button 
            onClick={() => onToggle(false)}
            className="text-yellow-700 hover:text-yellow-900"
          >
            ×
          </button>
        </div>
        
        <p className="text-sm text-yellow-700 mb-4">
          {t('lowBandwidth.description')}
        </p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-yellow-700">{t('lowBandwidth.disableImages')}</span>
            <button
              onClick={() => toggleSetting('disableImages')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                settings.disableImages ? 'bg-yellow-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.disableImages ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-yellow-700">{t('lowBandwidth.disableVideos')}</span>
            <button
              onClick={() => toggleSetting('disableVideos')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                settings.disableVideos ? 'bg-yellow-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.disableVideos ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-yellow-700">{t('lowBandwidth.reduceQuality')}</span>
            <button
              onClick={() => toggleSetting('reduceQuality')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                settings.reduceQuality ? 'bg-yellow-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.reduceQuality ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-1 text-sm text-yellow-700 hover:text-yellow-900"
        >
          <Settings size={16} />
          {showSettings ? t('lowBandwidth.hideSettings') : t('lowBandwidth.showSettings')}
        </button>
        
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-yellow-200">
            <p className="text-xs text-yellow-600">
              {t('lowBandwidth.dataSaverTip')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LowBandwidthMode;