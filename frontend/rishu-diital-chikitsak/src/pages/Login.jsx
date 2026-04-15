import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { login, guestLogin, logout } from '../shared/services/auth'
import Logo from '../shared/components/Logo'
import { useLanguage } from '../shared/contexts/LanguageContext'

export default function Login() {
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [role, setRole] = useState('patient')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { t } = useLanguage()

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Clear any existing authentication data
    logout();

    // Simple phone validation
    if (!/^\d{10}$/.test(phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      setIsLoading(false);
      return;
    }

    if (!pin) {
      toast.error('Please enter your PIN');
      setIsLoading(false);
      return;
    }

    try {
      // Call the login API
      const user = await login({ phone, pin });
      
      toast.success('Login successful!');
      
      // Navigate based on role
      if (user.role === 'patient') {
        navigate('/patient');
      } else {
        // Doctor: look up Supabase doctor row by phone to get doctor ID
        try {
          const { supabase } = await import('../shared/services/supabase')
          const { data: doc } = await supabase
            .from('doctors')
            .select('id, is_onboarded')
            .eq('phone', user.phone)
            .maybeSingle()

          if (doc?.id) {
            const stored = JSON.parse(localStorage.getItem('user') || '{}')
            stored.supabase_doctor_id = doc.id
            localStorage.setItem('user', JSON.stringify(stored))
            navigate(doc.is_onboarded ? '/doctor' : '/doctor/onboarding')
          } else {
            // No Supabase doctor row yet — go to onboarding to create one
            navigate('/doctor/onboarding')
          }
        } catch (supabaseErr) {
          console.warn('Supabase lookup failed, going to onboarding:', supabaseErr)
          navigate('/doctor/onboarding')
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.status === 401) {
        toast.error('Invalid credentials. Please check your phone number and PIN.');
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
        toast.error('Cannot connect to server. Make sure the backend is running on port 5000.');
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Guest login function
  const handleGuestLogin = () => {
    const user = guestLogin()
    toast.success('Guest login successful!')
    navigate('/patient')
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#E8F6F3' }}>
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto flex justify-center mb-6">
            <Logo size="xl" variant="rounded" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold" style={{ color: '#2C3E50' }}>
            Digital Chikitsak
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Login with your phone number and PIN
          </p>
        </div>
        
        <div className="mt-8 bg-white p-8 rounded-xl shadow-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  +91
                </span>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-r-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setPhone(value)
                  }}
                  maxLength="10"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Enter your 10-digit mobile number
              </p>
            </div>
            
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                PIN
              </label>
              <input
                id="pin"
                name="pin"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter your 4-digit PIN"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setPin(value)
                }}
                maxLength="4"
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter your 4-digit PIN
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
                style={{ backgroundColor: '#4ECDC4' }}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('auth.signingIn')}
                  </span>
                ) : t('auth.loginButton')}
              </button>

              {/* Guest Login Button */}
              <button
                type="button"
                onClick={handleGuestLogin}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ backgroundColor: '#95a5a6' }}
              >
                {t('auth.guestLogin')}
              </button>
            </div>

            <div className="text-center">
              <p className="mt-2 text-sm text-gray-600">
                {t('auth.noAccount')}{' '}
                <Link to="/register" className="font-medium hover:underline" style={{ color: '#4ECDC4' }}>
                  {t('auth.registerNow')}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}