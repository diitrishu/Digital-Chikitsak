import React, { useState } from 'react';
import { useLanguage } from '../shared/contexts/LanguageContext';
import { motion } from 'framer-motion';
import Header from '../shared/components/Header';
import BackButton from '../shared/components/BackButton';
import { createTestConsultation } from '../services/testData';
import { useNavigate } from 'react-router-dom';

const TestPage = () => {
  const { t, currentLanguage, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const [creatingTestConsultation, setCreatingTestConsultation] = useState(false);
  const [testConsultationResult, setTestConsultationResult] = useState(null);
  const [testConsultationError, setTestConsultationError] = useState(null);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'pa', name: 'Punjabi' }
  ];

  const handleCreateTestConsultation = async () => {
    setCreatingTestConsultation(true);
    setTestConsultationError(null);
    setTestConsultationResult(null);
    
    try {
      const consultation = await createTestConsultation();
      setTestConsultationResult(consultation);
      
      // Automatically navigate to the consultation after a short delay
      setTimeout(() => {
        navigate(`/patient/consultation/${consultation.consultation_id}`);
      }, 2000);
    } catch (error) {
      console.error('Error creating test consultation:', error);
      setTestConsultationError(error.message || 'Failed to create test consultation');
    } finally {
      setCreatingTestConsultation(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-4">
          <BackButton to="/" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            {t('nav.home')}
          </h1>
          
          {/* Test Consultation Section */}
          <div className="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h2 className="text-xl font-semibold text-yellow-800 mb-4">
              Test Video Consultation
            </h2>
            <p className="text-yellow-700 mb-4">
              Create a test consultation to try the video consultation feature
            </p>
            
            {testConsultationError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                Error: {testConsultationError}
              </div>
            )}
            
            {testConsultationResult && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                Test consultation created successfully! Redirecting to consultation page...
              </div>
            )}
            
            <button
              onClick={handleCreateTestConsultation}
              disabled={creatingTestConsultation}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {creatingTestConsultation ? 'Creating...' : 'Create Test Consultation'}
            </button>
          </div>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              {t('settings.language')}
            </h2>
            <div className="flex gap-4">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentLanguage === lang.code
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">
                {t('features.symptomChecker')}
              </h3>
              <p className="text-blue-700">
                {t('dashboard.symptomCheckerDesc')}
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">
                {t('features.videoConsultation')}
              </h3>
              <p className="text-green-700">
                {t('dashboard.videoDesc')}
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">
                {t('features.familyManagement')}
              </h3>
              <p className="text-purple-700">
                {t('dashboard.familyDesc')}
              </p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-800 mb-2">
                {t('features.pharmacyFinder')}
              </h3>
              <p className="text-orange-700">
                {t('dashboard.pharmacyDesc')}
              </p>
            </div>
          </div>
          
          <div className="mt-8 bg-teal-50 p-6 rounded-lg">
            <h3 className="font-semibold text-teal-800 mb-4">
              {t('dashboard.dailyTip')}
            </h3>
            <p className="text-teal-700">
              {t('dashboard.tipMessage')}
            </p>
          </div>
          
          <div className="mt-8">
            <h3 className="font-semibold text-gray-800 mb-4">
              {t('family.title')}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-700">0</div>
                <div className="text-gray-600">{t('dashboard.familyMembers')}</div>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-700">0</div>
                <div className="text-gray-600">{t('dashboard.reminders')}</div>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-700">0</div>
                <div className="text-gray-600">{t('dashboard.checkups')}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TestPage;
