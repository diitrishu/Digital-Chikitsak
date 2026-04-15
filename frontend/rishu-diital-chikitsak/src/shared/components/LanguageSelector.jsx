import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Logo from './Logo';

const LanguageSelector = ({ onLanguageSelect }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const languages = [
    {
      code: 'hi',
      name: 'Hindi',
      nativeName: 'हिंदी',
      description: 'हिंदी में जारी रखें'
    },
    {
      code: 'en', 
      name: 'English',
      nativeName: 'English',
      description: 'Continue in English'
    },
    {
      code: 'pa',
      name: 'Punjabi',
      nativeName: 'ਪੰਜਾਬੀ',
      description: 'ਪੰਜਾਬੀ ਵਿੱਚ ਜਾਰੀ ਰੱਖੋ'
    }
  ];

  const handleLanguageSelect = (langCode) => {
    setSelectedLanguage(langCode);
    localStorage.setItem('selectedLanguage', langCode);
    // Small delay to show selection before proceeding
    setTimeout(() => {
      if (onLanguageSelect) {
        onLanguageSelect(langCode);
      }
    }, 300);
  };

  const getTitle = () => {
    return 'Choose Your Language | अपनी भाषा चुनें | ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ';
  };

  const getAppName = () => {
    switch (selectedLanguage) {
      case 'hi': return 'डिजिटल चिकित्सक';
      case 'pa': return 'ਡਿਜਿਟਲ ਚਿਕਿਤਸਕ';
      default: return 'Digital Chikitsak';
    }
  };

  const getTagline = () => {
    switch (selectedLanguage) {
      case 'hi': return 'आपका भरोसेमंद स्वास्थ्य साथी';
      case 'pa': return 'ਤੁਹਾਡਾ ਭਰੋਸੇਮੰਦ ਸਿਹਤ ਸਾਥੀ';
      default: return 'Your trusted healthcare companion';
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image - Village and Healthcare Technology inspired design */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, 
            #f4e8b8 0%, 
            #e6d4a3 25%, 
            #d4c190 50%, 
            #1a237e 50%, 
            #283593 75%, 
            #1a237e 100%
          )`,
        }}
      />
      
      {/* Village side decorative elements */}
      <div className="absolute left-0 top-0 w-1/2 h-full">
        {/* Tree silhouette */}
        <div className="absolute bottom-20 left-10 w-32 h-40 opacity-60">
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-20 bg-amber-800 rounded-t-lg"></div>
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-28 h-28 bg-green-600 rounded-full"></div>
          <div className="absolute bottom-20 left-1/3 w-20 h-20 bg-green-700 rounded-full"></div>
          <div className="absolute bottom-18 right-1/3 w-16 h-16 bg-green-500 rounded-full"></div>
        </div>
        
        {/* Village buildings */}
        <div className="absolute bottom-10 left-20 w-8 h-12 bg-amber-600 opacity-50"></div>
        <div className="absolute bottom-10 left-32 w-6 h-8 bg-amber-700 opacity-50"></div>
        <div className="absolute bottom-10 left-40 w-10 h-14 bg-amber-500 opacity-50"></div>
        
        {/* People silhouettes */}
        <div className="absolute bottom-10 left-16 w-2 h-4 bg-gray-600 opacity-40"></div>
        <div className="absolute bottom-10 left-48 w-2 h-4 bg-gray-600 opacity-40"></div>
      </div>
      
      {/* Tech side decorative elements */}
      <div className="absolute right-0 top-0 w-1/2 h-full">
        {/* Network nodes */}
        <div className="absolute top-1/3 right-20 w-8 h-8 border-2 border-cyan-400 rounded-full bg-cyan-500 opacity-80"></div>
        <div className="absolute top-1/2 right-32 w-6 h-6 border-2 border-blue-400 rounded-full bg-blue-500 opacity-80"></div>
        <div className="absolute bottom-1/3 right-16 w-10 h-10 border-2 border-teal-400 rounded-full bg-teal-500 opacity-80"></div>
        
        {/* Network connections */}
        <svg className="absolute inset-0 w-full h-full opacity-30">
          <line x1="80%" y1="33%" x2="68%" y2="50%" stroke="#00bcd4" strokeWidth="2" strokeDasharray="5,5" />
          <line x1="68%" y1="50%" x2="84%" y2="67%" stroke="#00bcd4" strokeWidth="2" strokeDasharray="5,5" />
          <line x1="80%" y1="33%" x2="84%" y2="67%" stroke="#00bcd4" strokeWidth="2" strokeDasharray="5,5" />
        </svg>
        
        {/* Doctor icons */}
        <div className="absolute top-1/4 right-1/4 text-2xl opacity-70">👨‍⚕️</div>
        <div className="absolute bottom-1/4 right-1/3 text-2xl opacity-70">👩‍⚕️</div>
      </div>
      
      {/* Semi-transparent overlay to ensure text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-20" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo and Brand */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          {/* Digital Chikitsak Logo and Title */}
          <div className="flex flex-col items-center">
            <Logo size="2xl" variant="rounded" className="mx-auto mb-4" />
            <motion.h1
              key={selectedLanguage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-4xl md:text-5xl font-bold mb-3 text-white drop-shadow-lg text-center"
            >
              {getAppName()}
            </motion.h1>
          </div>
          
          {/* Tagline */}
          <motion.p
            key={`tagline-${selectedLanguage}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg md:text-xl text-white mb-8 drop-shadow-md"
          >
            {getTagline()}
          </motion.p>
        </motion.div>

        {/* Language Selection */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="w-full max-w-md"
        >
          {/* Title */}
          <motion.h2
            key={`title-${selectedLanguage}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold text-center mb-8 text-white drop-shadow-lg"
          >
            {getTitle()}
          </motion.h2>

          {/* Language Cards */}
          <div className="space-y-4">
            {languages.map((language, index) => (
              <motion.button
                key={language.code}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleLanguageSelect(language.code)}
                className={`w-full p-6 rounded-2xl border-2 transition-all duration-300 text-left shadow-lg ${
                  selectedLanguage === language.code
                    ? 'border-transparent shadow-2xl transform scale-105'
                    : 'border-white hover:shadow-xl'
                }`}
                style={{
                  backgroundColor: selectedLanguage === language.code ? '#4ECDC4' : 'white',
                  color: selectedLanguage === language.code ? 'white' : '#2C3E50'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold mb-1">
                      {language.nativeName}
                    </div>
                    <div className={`text-sm opacity-80 ${
                      selectedLanguage === language.code ? 'text-white' : 'text-gray-600'
                    }`}>
                      {language.description}
                    </div>
                  </div>
                  
                  {selectedLanguage === language.code && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center"
                    >
                      <div className="w-3 h-3 bg-current rounded-full"></div>
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mt-12 text-center text-gray-500 text-sm"
        >
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4ECDC4' }}></div>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#45B7B8' }}></div>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#26D0CE' }}></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LanguageSelector;