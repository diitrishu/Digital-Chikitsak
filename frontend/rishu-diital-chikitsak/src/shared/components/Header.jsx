import React from 'react'
import { getCurrentUser, logout, isGuestUser } from '../../shared/services/auth'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../shared/contexts/LanguageContext'

export default function Header() {
  const { t } = useLanguage()
  const user = getCurrentUser()
  const isGuest = isGuestUser()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white shadow-sm">
      <div className="flex items-center gap-3">
        <div className="text-lg font-semibold text-gray-800">{t('app.title')}</div>
        <div className="text-sm text-gray-500">{t('app.subtitle')}</div>
      </div>

      <div className="flex items-center gap-4">
        {user && <div className="text-sm text-gray-700">Hi, {user.name || user.phone}{isGuest && ' (Guest)'}</div>}
        <button onClick={handleLogout} className="px-3 py-1 rounded-md bg-primary text-white text-sm">
          {t('navigation.logout')}
        </button>
      </div>
    </header>
  )
}