import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const BackButton = ({ to, onClick, className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      const hasHistory = window.history.length > 1 && (window.history.state?.idx ?? 0) > 0;
      if (hasHistory) {
        navigate(-1);
        return;
      }

      const fallbackPath = location.pathname.startsWith('/patient')
        ? '/patient'
        : location.pathname.startsWith('/doctor')
          ? '/doctor'
          : '/';
      navigate(fallbackPath);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 shadow-sm hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors ${className}`}
    >
      <ArrowLeft size={20} />
      Back
    </button>
  );
};

export default BackButton;
