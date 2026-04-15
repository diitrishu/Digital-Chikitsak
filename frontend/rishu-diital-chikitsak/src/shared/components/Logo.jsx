import React from 'react';

const Logo = ({ 
  size = 'md', 
  showText = false, 
  className = '', 
  textColor = 'text-gray-800',
  variant = 'default' 
}) => {
  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-12 h-12', 
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
    '2xl': 'w-40 h-40'
  };

  const logoSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Image */}
      <div className={`${logoSize} flex items-center justify-center ${
        variant === 'rounded' ? 'rounded-full bg-white shadow-lg p-2' : ''
      }`}>
        <img 
          src="/images/Logo.png" 
          alt="Digital Chikitsak Logo" 
          className={`${logoSize} object-contain`}
        />
      </div>
      
      {/* Optional Text */}
      {showText && (
        <div className="flex flex-col">
          <h1 className={`font-bold ${textColor} ${
            size === 'xs' ? 'text-sm' :
            size === 'sm' ? 'text-base' :
            size === 'md' ? 'text-lg' :
            size === 'lg' ? 'text-xl' :
            size === 'xl' ? 'text-2xl' :
            'text-3xl'
          }`}>
            Digital Chikitsak
          </h1>
          <p className={`text-sm opacity-75 ${textColor}`}>
            Trusted Healthcare
          </p>
        </div>
      )}
    </div>
  );
};

export default Logo;