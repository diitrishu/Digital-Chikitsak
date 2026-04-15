import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import BackButton from '../shared/components/BackButton'

export default function SimpleRegistration() {
  const [formData, setFormData] = useState({
    phone: '',
    pin: '',
    name: '',
    age: '',
    gender: 'male',
    role: 'patient'
  })
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'phone' || name === 'age' 
        ? value.replace(/\D/g, '').slice(0, name === 'phone' ? 10 : 3)
        : name === 'pin' 
          ? value.replace(/\D/g, '').slice(0, 4)
          : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    // Validation
    if (!/^\d{10}$/.test(formData.phone)) {
      toast.error('Please enter a valid 10-digit phone number')
      setIsLoading(false)
      return
    }

    if (!formData.pin || formData.pin.length !== 4) {
      toast.error('Please enter a 4-digit PIN')
      setIsLoading(false)
      return
    }

    if (!formData.name) {
      toast.error('Please enter your name')
      setIsLoading(false)
      return
    }

    if (!formData.age || parseInt(formData.age) < 1 || parseInt(formData.age) > 120) {
      toast.error('Please enter a valid age')
      setIsLoading(false)
      return
    }

    try {
      const { register } = await import('../shared/services/auth')
      const user = await register({
        phone: formData.phone,
        pin: formData.pin,
        name: formData.name,
        role: formData.role
      })
      toast.success('Registration successful!')
      if (user.role === 'patient') {
        navigate('/patient')
      } else {
        navigate('/doctor')
      }
    } catch (error) {
      console.error('Registration error:', error)
      const msg = error.response?.data?.error || 'Registration failed. Please try again.'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#E8F6F3' }}>
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mb-6">
            <BackButton />
          </div>
          
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full" style={{ backgroundColor: '#4ECDC4' }}>
            <span className="text-3xl">📝</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold" style={{ color: '#2C3E50' }}>
            Register Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your Digital Chikitsak account
          </p>
        </div>
        
        <div className="mt-8 bg-white p-8 rounded-xl shadow-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
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
                  value={formData.phone}
                  onChange={handleChange}
                  maxLength="10"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                4-Digit PIN *
              </label>
              <input
                id="pin"
                name="pin"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter 4-digit PIN"
                value={formData.pin}
                onChange={handleChange}
                maxLength="4"
              />
              <p className="mt-2 text-xs text-gray-500">
                Remember this PIN for future logins
              </p>
            </div>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                  Age *
                </label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Age"
                  value={formData.age}
                  onChange={handleChange}
                  min="1"
                  max="120"
                />
              </div>
              
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                id="role"
                name="role"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
              </select>
            </div>

            <div>
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
                    Creating Account...
                  </span>
                ) : 'Register'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium hover:underline" style={{ color: '#4ECDC4' }}>
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
