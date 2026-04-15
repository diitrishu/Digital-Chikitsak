import React, { createContext, useContext, useState } from 'react';

// Import translation files
import enTranslations from '../../i18n/locales/en.json';
import hiTranslations from '../../i18n/locales/hi.json';
import paTranslations from '../../i18n/locales/pa.json';

// Translation data
const translations = {
  en: enTranslations,
  hi: hiTranslations,
  pa: paTranslations
};

// Create Language Context
const LanguageContext = createContext();

// Language Provider Component
export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('selectedLanguage') || 'en';
  });

  const humanizeKey = (key) => {
    if (!key || typeof key !== 'string') return '';

    const lastSegment = key.split('.').pop();

    if (!/^[A-Za-z0-9_-]+$/.test(lastSegment)) {
      return key;
    }

    return lastSegment
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Simple translation function with nested key support
  const t = (key) => {
    try {
      if (!key) return '';
      
      const keys = key.split('.');
      const currentLangData = translations[currentLanguage];
      const fallbackLangData = translations['en'];
      
      // Try current language first
      let value = currentLangData;
      for (const k of keys) {
        if (value && typeof value === 'object' && value.hasOwnProperty(k)) {
          value = value[k];
        } else {
          value = null;
          break;
        }
      }
      
      // If not found in current language, try English
      if (!value || typeof value !== 'string') {
        value = fallbackLangData;
        for (const k of keys) {
          if (value && typeof value === 'object' && value.hasOwnProperty(k)) {
            value = value[k];
          } else {
            value = null;
            break;
          }
        }
      }
      
      // Return the translated string or a readable fallback if not found
      return (value && typeof value === 'string') ? value : humanizeKey(key);
      
    } catch (error) {
      console.error('Translation error for key:', key, error);
      return humanizeKey(key);
    }
  };

  // Change language function
  const changeLanguage = (languageCode) => {
    setCurrentLanguage(languageCode);
    localStorage.setItem('selectedLanguage', languageCode);
  };

  const value = {
    currentLanguage,
    changeLanguage,
    t,
    translations: translations[currentLanguage] || translations['en']
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
