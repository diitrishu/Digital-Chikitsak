import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../shared/contexts/LanguageContext';

const Home = () => {
  const { t, currentLanguage } = useLanguage();
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E8F6F3' }}>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="text-8xl mb-6">🏥</div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ color: '#2C3E50' }}>
            <span style={{ color: '#4ECDC4' }}>{t('home.title')}</span>
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold mb-4" style={{ color: '#45B7B8' }}>
            {t('home.subtitle')}
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            {t('home.description')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/register"
              className="px-8 py-4 rounded-lg text-lg font-semibold text-white transition-colors"
              style={{ backgroundColor: '#4ECDC4' }}
            >
              {t('home.getStarted')}
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 rounded-lg text-lg font-semibold text-white transition-colors"
              style={{ backgroundColor: '#45B7B8' }}
            >
              {t('navigation.login')}
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-6xl mb-4 text-center">🤒</div>
            <h3 className="text-xl font-semibold mb-3 text-center">{t('features.visualSymptoms.title')}</h3>
            <p className="text-gray-700 text-center">{t('features.visualSymptoms.description')}</p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-6xl mb-4 text-center">🧠</div>
            <h3 className="text-xl font-semibold mb-3 text-center">{t('features.smartRecommendations.title')}</h3>
            <p className="text-gray-700 text-center">{t('features.smartRecommendations.description')}</p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-6xl mb-4 text-center">🎤</div>
            <h3 className="text-xl font-semibold mb-3 text-center">{t('features.voiceChat.title')}</h3>
            <p className="text-gray-700 text-center">{t('features.voiceChat.description')}</p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-6xl mb-4 text-center">🏪</div>
            <h3 className="text-xl font-semibold mb-3 text-center">{t('features.localPharmacy.title')}</h3>
            <p className="text-gray-700 text-center">{t('features.localPharmacy.description')}</p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-6xl mb-4 text-center">📹</div>
            <h3 className="text-xl font-semibold mb-3 text-center">{t('features.videoConsultationFeature.title')}</h3>
            <p className="text-gray-700 text-center">{t('features.videoConsultationFeature.description')}</p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-6xl mb-4 text-center">👨‍👩‍👧‍👦</div>
            <h3 className="text-xl font-semibold mb-3 text-center">{t('features.familyCare.title')}</h3>
            <p className="text-gray-700 text-center">{t('features.familyCare.description')}</p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-white rounded-xl p-8 text-center" style={{ background: 'linear-gradient(to right, #4ECDC4, #45B7B8)' }}>
          <h2 className="text-3xl font-bold mb-4">{t('home.startToday')}</h2>
          <p className="text-xl mb-6">{t('home.startTodayDesc')}</p>
          <Link
            to="/register"
            className="bg-white text-lg font-semibold px-8 py-4 rounded-lg transition-colors inline-flex items-center gap-2"
            style={{ color: '#4ECDC4' }}
          >
            {t('home.freeRegistration')}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 text-sm bg-white border-t">
        © {new Date().getFullYear()} {t('app.title')} • {t('home.footer')}
      </footer>
    </div>
  );
};

export default Home;