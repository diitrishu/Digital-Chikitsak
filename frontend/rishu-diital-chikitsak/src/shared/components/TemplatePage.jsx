import React from 'react';
import { useLocation } from 'react-router-dom';
import BackButton from './BackButton';

const TemplatePage = ({ title, description, backPath = '/' }) => {
  const location = useLocation();

  const resolvedBackPath = backPath !== '/'
    ? backPath
    : location.pathname.startsWith('/patient')
      ? '/patient'
      : location.pathname.startsWith('/doctor')
        ? '/doctor'
        : '/';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E8F6F3' }}>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <BackButton to={resolvedBackPath} />
        </div>

        <div className="max-w-md mx-auto text-center py-6">
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#4ECDC4' }}
          >
            <span className="text-3xl">H</span>
          </div>

          <h1 className="text-3xl font-bold mb-4" style={{ color: '#2C3E50' }}>
            {title}
          </h1>

          <p className="text-gray-600 mb-8">
            {description}
          </p>

          <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
            <div className="text-6xl mb-4">!</div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#4ECDC4' }}>
              Coming Soon
            </h2>
            <p className="text-gray-600">
              This feature is being developed with full multi-language support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePage;
