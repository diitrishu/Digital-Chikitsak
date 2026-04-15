import React, { useEffect } from 'react';
import { useLanguage } from '../../shared/contexts/LanguageContext'; // Use custom language context instead
import { WifiOff, RefreshCw, Download } from 'lucide-react';
import { flushQueue } from '../../utils/offlineQueue';

const OfflineMode = ({ onRetry }) => {
  const { t } = useLanguage(); // Use custom hook instead of useTranslation

  // Flush pending offline actions when connection is restored
  useEffect(() => {
    const handleOnline = () => {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || ''
      const apiUrl = import.meta.env.VITE_API_URL || ''
      if (apiUrl) flushQueue(apiUrl, token)
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        <WifiOff className="mx-auto text-gray-400 mb-4" size={64} />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {t('offlineMode.title')}
        </h2>
        <p className="text-gray-600 mb-6">
          {t('offlineMode.description')}
        </p>
        
        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <Download size={20} />
            {t('offlineMode.availableFeatures')}
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• {t('offlineMode.feature1')}</li>
            <li>• {t('offlineMode.feature2')}</li>
            <li>• {t('offlineMode.feature3')}</li>
            <li>• {t('offlineMode.feature4')}</li>
          </ul>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={20} />
            {t('offlineMode.retry')}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            {t('offlineMode.refresh')}
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-6">
          {t('offlineMode.autoReconnect')}
        </p>
      </div>
    </div>
  );
};

export default OfflineMode;