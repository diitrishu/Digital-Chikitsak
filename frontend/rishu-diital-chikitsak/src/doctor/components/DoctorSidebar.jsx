import React from 'react'
import { NavLink } from 'react-router-dom'
import Logo from '../../shared/components/Logo'

export default function DoctorSidebar() {
  const links = [
    { to: '/doctor', label: 'Dashboard' },
    { to: '/doctor/tokens', label: '🎫 Patient Queue' },
    { to: '/doctor/consultation/1', label: 'Consultations' },
  ]

  return (
    <aside className="hidden md:block w-64 bg-white border-r p-4">
      {/* Logo Section */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <Logo size="md" showText={true} textColor="text-gray-800" />
      </div>
      
      <div className="text-lg font-semibold mb-4">Doctor</div>
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
