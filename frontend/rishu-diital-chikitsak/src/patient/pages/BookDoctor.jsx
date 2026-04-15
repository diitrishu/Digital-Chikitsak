import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Stethoscope, MapPin, Phone, Star, CheckCircle, Loader } from 'lucide-react';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import AppShell from '../components/AppShell';
import { createConsultation } from '../../shared/services/consultations';
import { getCurrentUser } from '../../shared/services/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../shared/services/supabase';

const SPEC_LABELS = {
  general:          'General Physician',
  respiratory:      'Respiratory',
  gastroenterology: 'Gastroenterology',
  orthopedics:      'Orthopedics',
  dermatology:      'Dermatology',
  cardiology:       'Cardiology',
  pediatrics:       'Pediatrics',
  geriatrics:       'Geriatrics',
};

const BookDoctor = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [familyMember, setFamilyMember] = useState('self');
  const [symptoms, setSymptoms] = useState('');
  const [appointmentType, setAppointmentType] = useState('video');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdConsultation, setCreatedConsultation] = useState(null);

  // Real doctors from Supabase
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  useEffect(() => {
    async function fetchDoctors() {
      setLoadingDoctors(true);
      const { data, error } = await supabase
        .from('doctors')
        .select('id, name, specialization, experience, hospital, languages, status, profile_image, bio, avg_consult_time, qualification')
        .eq('is_onboarded', true)
        .order('name');
      if (!error && data) setDoctors(data);
      setLoadingDoctors(false);
    }
    fetchDoctors();
  }, []);

  // Generate time slots based on avg_consult_time
  const getTimeSlots = () => {
    if (!selectedDoctor) return [];
    const slots = [];
    const interval = selectedDoctor.avg_consult_time || 15;
    let hour = 9, min = 0;
    while (hour < 17) {
      slots.push(`${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`);
      min += interval;
      if (min >= 60) { hour += Math.floor(min / 60); min = min % 60; }
    }
    return slots;
  };

  const familyMembers = [
    { id: 'self', name: 'Self' },
    { id: 'spouse', name: 'Spouse' },
    { id: 'child', name: 'Child' },
    { id: 'parent', name: 'Parent' }
  ];

  const formatDate = (date) => date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const handleDoctorSelect = (doctor) => { setSelectedDoctor(doctor); setStep(2); };
  const handleTimeSelect = (time) => { setSelectedTime(time); setStep(3); };

  const confirmAppointment = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = getCurrentUser();
      const consultation = await createConsultation({
        patient_id: user?.phone || 'demo-patient-id',
        doctor_id: selectedDoctor.id,
        symptoms,
      });
      setCreatedConsultation(consultation);
      setStep(4);
    } catch (err) {
      setError('Failed to create appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetBooking = () => {
    setStep(1); setSelectedDoctor(null); setSelectedTime(null);
    setSymptoms(''); setError(null); setCreatedConsultation(null);
  };

  return (
    <AppShell title="Book Doctor">
      <div className="container mx-auto px-4 py-5">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#4ECDC4' }}>
            <Stethoscope className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Book Doctor Appointment</h1>
          <p className="text-gray-600">Schedule a consultation with our registered doctors</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1,2,3,4].map(num => (
              <div key={num} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= num ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{num}</div>
                {num < 4 && <div className={`w-16 h-1 mx-2 ${step > num ? 'bg-teal-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Select Doctor</span><span>Select Time</span><span>Confirm</span><span>Complete</span>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"><p className="text-red-700">{error}</p></div>}

        {/* Step 1: Select Doctor */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Select a Doctor</h2>

            {loadingDoctors ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Loader size={40} className="animate-spin mb-4 text-teal-500" />
                <p>Loading doctors...</p>
              </div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">👨‍⚕️</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No doctors available yet</h3>
                <p className="text-gray-400 text-sm">Doctors will appear here once they register and complete their profile.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {doctors.map(doctor => (
                  <div
                    key={doctor.id}
                    className="border border-gray-200 rounded-xl p-6 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleDoctorSelect(doctor)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {doctor.profile_image
                          ? <img src={doctor.profile_image} alt={doctor.name} className="w-full h-full object-cover" />
                          : <User className="text-teal-600" size={32} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-bold text-gray-800">{doctor.name}</h3>
                            <p className="text-teal-600 font-medium text-sm">{SPEC_LABELS[doctor.specialization] || doctor.specialization}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${doctor.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {doctor.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                          </span>
                        </div>
                        <div className="mt-3 space-y-1.5">
                          {doctor.experience > 0 && (
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                              <Clock size={14} /><span>{doctor.experience} yrs experience</span>
                            </div>
                          )}
                          {doctor.hospital && (
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                              <MapPin size={14} /><span>{doctor.hospital}</span>
                            </div>
                          )}
                          {doctor.qualification && (
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                              <Star size={14} /><span>{doctor.qualification}</span>
                            </div>
                          )}
                          {doctor.languages?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {doctor.languages.map(lang => (
                                <span key={lang} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{lang}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        {doctor.bio && <p className="text-gray-400 text-xs mt-2 line-clamp-2">{doctor.bio}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Time */}
        {step === 2 && selectedDoctor && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-700">←</button>
              <h2 className="text-2xl font-bold text-gray-800">Select Appointment Time</h2>
            </div>
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center overflow-hidden">
                {selectedDoctor.profile_image
                  ? <img src={selectedDoctor.profile_image} alt={selectedDoctor.name} className="w-full h-full object-cover" />
                  : <User className="text-teal-600" size={24} />}
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{selectedDoctor.name}</h3>
                <p className="text-sm text-gray-600">{SPEC_LABELS[selectedDoctor.specialization] || selectedDoctor.specialization}</p>
              </div>
            </div>
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Select Date</h3>
              <div className="grid grid-cols-3 gap-4">
                {[0,1,2].map(days => {
                  const date = new Date(); date.setDate(date.getDate() + days);
                  return (
                    <button key={days} onClick={() => setSelectedDate(date)}
                      className={`p-4 rounded-lg border-2 transition-all ${selectedDate.toDateString() === date.toDateString() ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="font-medium">{days === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className="text-sm text-gray-600">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Available Time Slots</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {getTimeSlots().map(time => (
                  <button key={time} onClick={() => handleTimeSelect(time)}
                    className="py-3 px-2 rounded-lg border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-all text-center">
                    <Clock size={14} className="mx-auto mb-1" />
                    <span className="text-sm font-medium">{time}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && selectedDoctor && selectedTime && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setStep(2)} className="text-gray-500 hover:text-gray-700">←</button>
              <h2 className="text-2xl font-bold text-gray-800">Confirm Appointment</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Doctor Information</h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center overflow-hidden">
                    {selectedDoctor.profile_image
                      ? <img src={selectedDoctor.profile_image} alt={selectedDoctor.name} className="w-full h-full object-cover" />
                      : <User className="text-teal-600" size={32} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{selectedDoctor.name}</h4>
                    <p className="text-teal-600 text-sm">{SPEC_LABELS[selectedDoctor.specialization] || selectedDoctor.specialization}</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3"><Calendar className="text-gray-400" size={18} /><span>{formatDate(selectedDate)}</span></div>
                  <div className="flex items-center gap-3"><Clock className="text-gray-400" size={18} /><span>{selectedTime}</span></div>
                  {selectedDoctor.hospital && <div className="flex items-center gap-3"><MapPin className="text-gray-400" size={18} /><span>{selectedDoctor.hospital}</span></div>}
                  {selectedDoctor.languages?.length > 0 && <div className="flex items-center gap-3"><Phone className="text-gray-400" size={18} /><span>{selectedDoctor.languages.join(', ')}</span></div>}
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Appointment for</label>
                  <select value={familyMember} onChange={e => setFamilyMember(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500">
                    {familyMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brief description of symptoms</label>
                  <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)}
                    placeholder="Describe your symptoms..." className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Appointment Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['video','inperson'].map(type => (
                      <button key={type} onClick={() => setAppointmentType(type)}
                        className={`p-3 rounded-lg border-2 transition-all ${appointmentType === type ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}>
                        <div className="font-medium">{type === 'video' ? '📹 Video Call' : '🏥 In Person'}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={confirmAppointment} disabled={loading}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50">
                  {loading ? 'Creating Appointment...' : 'Confirm Appointment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-green-500" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Appointment Confirmed!</h2>
            <p className="text-gray-600 mb-6">Your appointment has been successfully booked.</p>
            <div className="bg-gray-50 rounded-lg p-6 text-left space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Doctor:</span><span className="font-medium">{selectedDoctor?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date:</span><span className="font-medium">{formatDate(selectedDate)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Time:</span><span className="font-medium">{selectedTime}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type:</span><span className="font-medium">{appointmentType === 'video' ? 'Video Call' : 'In Person'}</span></div>
            </div>
            {createdConsultation?.meeting_link && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800 mb-2">Your video consultation is ready!</p>
                <button onClick={() => navigate(`/patient/consultation/${createdConsultation.consultation_id}`)}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium">
                  Join Video Call
                </button>
              </div>
            )}
            <div className="flex gap-4 mt-8">
              <button onClick={resetBooking} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-lg font-medium">Book Another</button>
              <button onClick={() => navigate('/patient')} className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium">Back to Dashboard</button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default BookDoctor;
import { useLanguage } from '../../shared/contexts/LanguageContext';
import AppShell from '../components/AppShell';
import { createConsultation } from '../../shared/services/consultations';
import { getCurrentUser } from '../../shared/services/auth';
import { useNavigate } from 'react-router-dom';

const BookDoctor = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Select Doctor, 2: Select Time, 3: Confirm, 4: Success
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [familyMember, setFamilyMember] = useState('self');
  const [symptoms, setSymptoms] = useState('');
  const [appointmentType, setAppointmentType] = useState('video');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdConsultation, setCreatedConsultation] = useState(null);

  // Mock doctor data
  const doctors = [
    {
      id: 1,
      name: 'Dr. Rajesh Kumar',
      specialty: 'General Physician',
      experience: '15 years',
      rating: 4.8,
      reviews: 1240,
      languages: ['English', 'Hindi', 'Punjabi'],
      availability: {
        today: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        tomorrow: ['09:30', '10:30', '11:30', '14:30', '15:30', '16:30'],
        dayAfter: ['10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
      },
      fee: 500,
      location: 'Patiala, Punjab'
    },
    {
      id: 2,
      name: 'Dr. Priya Sharma',
      specialty: 'Pediatrician',
      experience: '10 years',
      rating: 4.9,
      reviews: 980,
      languages: ['English', 'Hindi'],
      availability: {
        today: ['10:00', '11:00', '15:00', '16:00', '17:00'],
        tomorrow: ['09:00', '10:00', '14:00', '15:00', '16:00'],
        dayAfter: ['11:00', '12:00', '15:00', '16:00', '17:00']
      },
      fee: 600,
      location: 'Chandigarh, Punjab'
    },
    {
      id: 3,
      name: 'Dr. Amarjit Singh',
      specialty: 'Cardiologist',
      experience: '20 years',
      rating: 4.7,
      reviews: 850,
      languages: ['Punjabi', 'Hindi'],
      availability: {
        today: ['11:00', '12:00', '16:00', '17:00'],
        tomorrow: ['10:00', '11:00', '15:00', '16:00'],
        dayAfter: ['09:00', '10:00', '14:00', '15:00']
      },
      fee: 800,
      location: 'Amritsar, Punjab'
    },
    {
      id: 4,
      name: 'Dr. Meera Patel',
      specialty: 'Dermatologist',
      experience: '12 years',
      rating: 4.6,
      reviews: 720,
      languages: ['English', 'Gujarati', 'Hindi'],
      availability: {
        today: ['09:00', '10:00', '14:00', '15:00'],
        tomorrow: ['11:00', '12:00', '16:00', '17:00'],
        dayAfter: ['10:00', '11:00', '15:00', '16:00']
      },
      fee: 700,
      location: 'Ludhiana, Punjab'
    }
  ];

  // Mock family members
  const familyMembers = [
    { id: 'self', name: 'Self' },
    { id: 'spouse', name: 'Spouse' },
    { id: 'child', name: 'Child' },
    { id: 'parent', name: 'Parent' }
  ];

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
    setStep(2);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setStep(3);
  };

  const confirmAppointment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get current user
      const user = getCurrentUser();
      
      // For demo purposes, we'll use the user's phone as patient_id
      // In a real app, this would come from the selected family member
      const patientId = user?.phone || 'demo-patient-id';
      
      // Create consultation with the backend
      const consultationData = {
        patient_id: patientId,
        doctor_id: selectedDoctor.id.toString(),
        symptoms: symptoms
      };
      
      const consultation = await createConsultation(consultationData);
      setCreatedConsultation(consultation);
      setStep(4);
    } catch (err) {
      console.error('Error creating consultation:', err);
      setError(t('bookDoctor.errorCreatingAppointment') || 'Failed to create appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedDoctor(null);
    setSelectedTime(null);
    setSymptoms('');
    setError(null);
    setCreatedConsultation(null);
  };

  const goToConsultation = () => {
    if (createdConsultation?.consultation_id) {
      navigate(`/patient/consultation/${createdConsultation.consultation_id}`);
    }
  };

  const getTimeSlots = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    if (selectedDate.toDateString() === today.toDateString()) {
      return selectedDoctor.availability.today;
    } else if (selectedDate.toDateString() === tomorrow.toDateString()) {
      return selectedDoctor.availability.tomorrow;
    } else {
      return selectedDoctor.availability.dayAfter;
    }
  };

  return (
    <AppShell title="Book Doctor">
      <div className="container mx-auto px-4 py-5">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#4ECDC4' }}>
            <Stethoscope className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {t('bookDoctor.title') || 'Book Doctor Appointment'}
          </h1>
          <p className="text-gray-600">
            {t('bookDoctor.subtitle') || 'Schedule a consultation with healthcare providers'}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= num ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {num}
                </div>
                {num < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step > num ? 'bg-teal-500' : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>{t('bookDoctor.selectDoctor') || 'Select Doctor'}</span>
            <span>{t('bookDoctor.selectTime') || 'Select Time'}</span>
            <span>{t('bookDoctor.confirm') || 'Confirm'}</span>
            <span>{t('bookDoctor.complete') || 'Complete'}</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Step 1: Select Doctor */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {t('bookDoctor.selectDoctor') || 'Select a Doctor'}
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {doctors.map(doctor => (
                <div 
                  key={doctor.id}
                  className="border border-gray-200 rounded-xl p-6 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleDoctorSelect(doctor)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
                      <User className="text-teal-600" size={32} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{doctor.name}</h3>
                          <p className="text-teal-600 font-medium">{doctor.specialty}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">
                          <Star size={14} fill="currentColor" />
                          {doctor.rating}
                        </div>
                      </div>
                      
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock size={16} />
                          <span className="text-sm">{doctor.experience} experience</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin size={16} />
                          <span className="text-sm">{doctor.location}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {doctor.languages.map(lang => (
                            <span key={lang} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-800">₹{doctor.fee}</span>
                          <span className="text-sm text-gray-500">{doctor.reviews} reviews</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Time */}
        {step === 2 && selectedDoctor && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => setStep(1)}
                className="text-gray-500 hover:text-gray-700"
              >
                ←
              </button>
              <h2 className="text-2xl font-bold text-gray-800">
                {t('bookDoctor.selectTime') || 'Select Appointment Time'}
              </h2>
            </div>
            
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                <User className="text-teal-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{selectedDoctor.name}</h3>
                <p className="text-sm text-gray-600">{selectedDoctor.specialty}</p>
              </div>
            </div>
            
            {/* Date Selection */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {t('bookDoctor.selectDate') || 'Select Date'}
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map(days => {
                  const date = new Date();
                  date.setDate(date.getDate() + days);
                  const isToday = days === 0;
                  
                  return (
                    <button
                      key={days}
                      onClick={() => setSelectedDate(date)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedDate.toDateString() === date.toDateString()
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">
                        {isToday ? t('common.today') || 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-sm text-gray-600">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Time Slots */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {t('bookDoctor.availableSlots') || 'Available Time Slots'}
              </h3>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {getTimeSlots().map(time => (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className="py-3 px-2 rounded-lg border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-all"
                  >
                    <Clock size={16} className="mx-auto mb-1" />
                    <span className="text-sm font-medium">{time}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm Appointment */}
        {step === 3 && selectedDoctor && selectedTime && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => setStep(2)}
                className="text-gray-500 hover:text-gray-700"
              >
                ←
              </button>
              <h2 className="text-2xl font-bold text-gray-800">
                {t('bookDoctor.confirmDetails') || 'Confirm Appointment Details'}
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Doctor Info */}
              <div className="border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {t('bookDoctor.doctorInfo') || 'Doctor Information'}
                </h3>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
                    <User className="text-teal-600" size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{selectedDoctor.name}</h4>
                    <p className="text-teal-600">{selectedDoctor.specialty}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-gray-400" size={20} />
                    <span>{formatDate(selectedDate)}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="text-gray-400" size={20} />
                    <span>{selectedTime}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <MapPin className="text-gray-400" size={20} />
                    <span>{selectedDoctor.location}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Phone className="text-gray-400" size={20} />
                    <span>{selectedDoctor.languages.join(', ')}</span>
                  </div>
                </div>
              </div>
              
              {/* Appointment Details */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    {t('bookDoctor.appointmentDetails') || 'Appointment Details'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('bookDoctor.for') || 'Appointment for'}
                      </label>
                      <select
                        value={familyMember}
                        onChange={(e) => setFamilyMember(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        {familyMembers.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('bookDoctor.symptoms') || 'Brief description of symptoms'}
                      </label>
                      <textarea
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder={t('bookDoctor.symptomsPlaceholder') || 'Describe your symptoms...'}
                        className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('bookDoctor.appointmentType') || 'Appointment Type'}
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setAppointmentType('video')}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            appointmentType === 'video'
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium">{t('bookDoctor.video') || 'Video Call'}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            ₹{selectedDoctor.fee}
                          </div>
                        </button>
                        
                        <button
                          onClick={() => setAppointmentType('inperson')}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            appointmentType === 'inperson'
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium">{t('bookDoctor.inPerson') || 'In Person'}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            ₹{selectedDoctor.fee + 100}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between font-bold">
                    <span>{t('bookDoctor.total') || 'Total Amount'}:</span>
                    <span>₹{appointmentType === 'video' ? selectedDoctor.fee : selectedDoctor.fee + 100}</span>
                  </div>
                </div>
                
                <button
                  onClick={confirmAppointment}
                  disabled={loading}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? t('bookDoctor.creatingAppointment') || 'Creating Appointment...' : t('bookDoctor.confirmAppointment') || 'Confirm Appointment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-green-500" size={40} />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {t('bookDoctor.appointmentConfirmed') || 'Appointment Confirmed!'}
            </h2>
            
            <p className="text-gray-600 mb-2">
              {t('bookDoctor.confirmationMessage') || 'Your appointment has been successfully booked.'}
            </p>
            
            <div className="bg-gray-50 rounded-lg p-6 mt-6 text-left">
              <h3 className="font-bold text-gray-800 mb-4">
                {t('bookDoctor.appointmentDetails') || 'Appointment Details'}
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('bookDoctor.doctor') || 'Doctor'}:</span>
                  <span className="font-medium">{selectedDoctor?.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('bookDoctor.date') || 'Date'}:</span>
                  <span className="font-medium">{formatDate(selectedDate)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('bookDoctor.time') || 'Time'}:</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('bookDoctor.type') || 'Type'}:</span>
                  <span className="font-medium">
                    {appointmentType === 'video' ? t('bookDoctor.video') : t('bookDoctor.inPerson')}
                  </span>
                </div>
                
                <div className="flex justify-between pt-4 border-t border-gray-200">
                  <span className="text-gray-600">{t('bookDoctor.amount') || 'Amount'}:</span>
                  <span className="font-bold text-lg">
                    ₹{appointmentType === 'video' ? selectedDoctor?.fee : selectedDoctor?.fee + 100}
                  </span>
                </div>
              </div>
            </div>
            
            {createdConsultation?.meeting_link && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800 mb-2">
                  {t('bookDoctor.videoConsultationReady') || 'Your video consultation is ready!'}
                </p>
                <button
                  onClick={goToConsultation}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  {t('bookDoctor.joinVideoCall') || 'Join Video Call'}
                </button>
              </div>
            )}
            
            <div className="flex gap-4 mt-8">
              <button
                onClick={resetBooking}
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-lg font-medium transition-colors"
              >
                {t('bookDoctor.bookAnother') || 'Book Another Appointment'}
              </button>
              <button
                onClick={() => navigate('/patient')}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium transition-colors"
              >
                {t('bookDoctor.backToDashboard') || 'Back to Dashboard'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default BookDoctor;
