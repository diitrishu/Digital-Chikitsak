/**
 * AppShell — Unified layout wrapper for all patient pages
 * Desktop: left sidebar + content
 * Mobile: top header + bottom nav
 */
import React, { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Stethoscope, Pill, FileText, Users,
  BookOpen, Settings, LogOut, Menu, X, AlertTriangle, Bell, MessageCircle, ArrowLeft
} from 'lucide-react'
import { useLanguage } from '../../shared/contexts/LanguageContext'
import { getCurrentUser, logout } from '../../shared/services/auth'
import EmergencyHelp from '../../shared/components/EmergencyHelp'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/patient',              icon: LayoutDashboard, label: 'Home',        exact: true },
  { to: '/patient/symptom-checker', icon: Stethoscope,  label: 'Consult' },
  { to: '/patient/chats',        icon: MessageCircle,   label: 'Messages' },
  { to: '/patient/pharmacy',     icon: Pill,            label: 'Pharmacy' },
  { to: '/patient/records',      icon: FileText,        label: 'Records' },
  { to: '/patient/family',       icon: Users,           label: 'Family' },
  { to: '/patient/education',    icon: BookOpen,        label: 'Learn' },
  { to: '/patient/settings',     icon: Settings,        label: 'Settings' },
]

export default function AppShell({ children, title = '' }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const user = getCurrentUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showEmergency, setShowEmergency] = useState(false)

  // Show back button on all pages except the patient dashboard itself
  const isDashboard = location.pathname === '/patient'
  const canGoBack = !isDashboard && (window.history.state?.idx ?? 0) > 0

  const handleBack = () => navigate(-1)

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {showEmergency && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
          <div className="p-4">
            <button onClick={() => setShowEmergency(false)} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800">
              ← Back
            </button>
            <EmergencyHelp />
          </div>
        </div>
      )}
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 fixed h-full z-20">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center">
              <span className="text-white font-black text-sm">DC</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-none">Digital Chikitsak</p>
              <p className="text-xs text-gray-400 mt-0.5">Healthcare Platform</p>
            </div>
          </div>
        </div>

        {/* User */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-teal-50">
            <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 text-sm truncate">{user?.name || 'Patient'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.phone}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Emergency + Logout */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-2">
          <button
            onClick={() => setShowEmergency(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <AlertTriangle size={18} />
            Emergency Help
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 lg:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu size={20} />
            </button>
            {canGoBack && (
              <button
                onClick={handleBack}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Go back"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="font-semibold text-gray-800 text-base">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100 relative">
              <Bell size={18} className="text-gray-500" />
            </button>
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-xs lg:hidden">
              {user?.name?.charAt(0)?.toUpperCase() || 'P'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Nav ────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20 px-2 py-2">
        <div className="flex justify-around">
          {NAV.slice(0, 5).map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                  isActive ? 'text-teal-600' : 'text-gray-400'
                }`
              }
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ── Mobile Drawer ────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 bg-white h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <span className="font-bold text-gray-800">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV.map(({ to, icon: Icon, label, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${
                      isActive ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="px-3 py-4 border-t space-y-2">
              <button
                onClick={() => { setMobileMenuOpen(false); setShowEmergency(true) }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50"
              >
                <AlertTriangle size={18} />
                Emergency Help
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-500 hover:bg-gray-50"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
