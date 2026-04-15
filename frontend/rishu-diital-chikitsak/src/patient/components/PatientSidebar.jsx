import React from 'react'
import { NavLink } from 'react-router-dom'
import Logo from './Logo'
import { useLanguage } from '../../shared/contexts/LanguageContext'

export default function PatientSidebar() {
  const { t } = useLanguage()

  const tr = (key, fallback = '') => {
    const value = t(key)
    return value === key ? fallback : value
  }
  
  const links = [
    { to: '/patient', label: tr('navigation.dashboard', 'Dashboard') },
    { to: '/patient/symptom-checker', label: tr('features.symptomChecker', 'Symptom Checker') },
    { to: '/patient/book-doctor', label: tr('consultation.bookDoctor', 'Book Doctor') },
    { to: '/patient/instant-consultation', label: tr('features.videoConsultation', 'Video Consultation') },
    { to: '/patient/pharmacy', label: tr('common.pharmacy', 'Pharmacy') },
    { to: '/patient/family', label: tr('family.familyMembers', 'Family Members') },
    { to: '/patient/tokens', label: tr('common.tokens', 'Tokens') },
  ]

  return (
    <aside className="hidden md:block w-64 bg-white border-r p-4">
      {/* Logo Section */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <Logo size="md" showText={true} textColor="text-gray-800" />
      </div>
      
      <div className="text-lg font-semibold mb-4">{tr('common.patient', 'Patient')}</div>
      <nav className="flex flex-col gap-2">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `px-3 py-2 rounded-md ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-slate-50'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
