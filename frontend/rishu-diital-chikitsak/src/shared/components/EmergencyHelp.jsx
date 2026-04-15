import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  MapPin,
  Navigation,
  AlertTriangle,
  Hospital,
  Shield,
} from 'lucide-react';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const EmergencyHelp = () => {
  const { t } = useLanguage();
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [hospitalError, setHospitalError] = useState('');

  const emergencyContacts = [
    { name: t('emergency.ambulance') || 'Ambulance', number: '108', icon: '🚑', type: 'ambulance' },
    { name: t('emergency.police') || 'Police', number: '100', icon: '👮', type: 'police' },
    { name: t('emergency.fire') || 'Fire Brigade', number: '101', icon: '🚒', type: 'fire' },
    { name: t('emergency.disaster') || 'Disaster Helpline', number: '1078', icon: '⚠️', type: 'disaster' },
  ];

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    setLoading(true);
    setLocationError('');
    setHospitalError('');

    if (!navigator.geolocation) {
      setLoading(false);
      setNearbyHospitals([]);
      setLocationError('This browser does not support location, so nearby hospital search is unavailable.');
      toast.error(t('emergency.locationNotSupported') || 'Location not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(location);
        loadNearbyHospitals(location);
      },
      (error) => {
        console.error('Location error:', error);
        setLoading(false);
        setNearbyHospitals([]);
        setLocationError('Location access is required to show nearby hospitals from the local hospital dataset.');
        toast.error(t('emergency.locationError') || 'Unable to get your location');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const loadNearbyHospitals = async (location) => {
    try {
      const response = await api.getNearbyHospitals({
        latitude: location.latitude,
        longitude: location.longitude,
        radius: 50,
        limit: 8,
      });

      setNearbyHospitals(response.hospitals || []);
    } catch (error) {
      console.error('Hospital loading error:', error);
      setNearbyHospitals([]);
      setHospitalError('Unable to load real hospital records from the backend dataset.');
      toast.error('Unable to load nearby hospitals');
    } finally {
      setLoading(false);
    }
  };

  const makeEmergencyCall = (number, type) => {
    if (type === 'ambulance') {
      const confirmed = window.confirm(
        t('emergency.confirmAmbulance') ||
          'Are you sure you want to call ambulance? This will dial 108.'
      );
      if (!confirmed) {
        return;
      }
      window.location.href = `tel:${number}`;
      toast.success(t('emergency.callingAmbulance') || 'Calling ambulance...');
      return;
    }

    window.location.href = `tel:${number}`;
    toast.success(t('emergency.calling') || `Calling ${number}...`);
  };

  const callHospital = (hospital) => {
    if (!hospital.phone) {
      toast.error('Phone number is not available for this hospital in the source data');
      return;
    }

    window.location.href = `tel:${hospital.phone}`;
    toast.success(t('emergency.callingHospital') || `Calling ${hospital.name}...`);
  };

  const openDirections = (hospital) => {
    const destination = `${hospital.latitude},${hospital.longitude}`;
    if (userLocation) {
      window.open(
        `https://www.google.com/maps/dir/${userLocation.latitude},${userLocation.longitude}/${destination}`,
        '_blank'
      );
    } else {
      window.open(`https://www.google.com/maps/search/${destination}`, '_blank');
    }
    toast.success(t('emergency.openingDirections') || 'Opening directions...');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E8F6F3' }}>
      <div className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div
            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: '#FF6B6B' }}
          >
            <AlertTriangle className="text-white" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {t('emergency.title')}
          </h1>
          <p className="text-gray-600">
            {t('emergency.subtitle') || 'Quick access to emergency services and nearby hospitals'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Phone size={24} className="text-red-500" />
            {t('emergency.quickCall') || 'Emergency Numbers'}
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {emergencyContacts.map((contact, index) => (
              <motion.button
                key={contact.number}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => makeEmergencyCall(contact.number, contact.type)}
                className={`p-6 rounded-xl text-white font-bold transition-all transform hover:scale-105 active:scale-95 ${
                  contact.type === 'ambulance'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
                style={{
                  background:
                    contact.type === 'ambulance'
                      ? 'linear-gradient(135deg, #FF6B6B, #FF5252)'
                      : 'linear-gradient(135deg, #4ECDC4, #45B7B8)',
                }}
              >
                <div className="text-4xl mb-2">{contact.icon}</div>
                <div className="text-lg font-bold mb-1">{contact.name}</div>
                <div className="text-2xl font-black">{contact.number}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Hospital size={24} className="text-blue-500" />
            {t('emergency.nearestHospital')}
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">
                  {t('emergency.findingHospitals') || 'Finding nearby hospitals...'}
                </p>
              </div>
            </div>
          ) : nearbyHospitals.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-600">
              {locationError ||
                hospitalError ||
                'No hospitals were found near your current location in the local dataset.'}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {nearbyHospitals.map((hospital, index) => (
                <motion.div
                  key={hospital.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-1">{hospital.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <MapPin size={16} />
                        <span>{hospital.address || 'Address not available in source data'}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        {(hospital.district || hospital.state) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {[hospital.district, hospital.state].filter(Boolean).join(', ')}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-gray-600">
                          <Navigation size={14} />
                          {hospital.distance_km} km
                        </span>
                      </div>
                    </div>
                    {hospital.emergency && (
                      <div className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                        24x7
                      </div>
                    )}
                  </div>

                  <div className="mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Phone size={16} />
                      <span>{hospital.phone || 'Phone not listed in source data'}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => callHospital(hospital)}
                      disabled={!hospital.phone}
                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Phone size={16} />
                      {t('emergency.call') || 'Call'}
                    </button>
                    <button
                      onClick={() => openDirections(hospital)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Navigation size={16} />
                      {t('emergency.directions') || 'Directions'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6"
        >
          <h3 className="text-lg font-bold text-yellow-800 mb-3 flex items-center gap-2">
            <Shield size={20} />
            {t('emergency.tips') || 'Emergency Tips'}
          </h3>
          <ul className="text-yellow-700 space-y-2 text-sm">
            <li>• {t('emergency.tip1') || 'Stay calm and assess the situation'}</li>
            <li>
              • {t('emergency.tip2') || 'Call emergency services immediately if life-threatening'}
            </li>
            <li>• {t('emergency.tip3') || 'Provide clear location details when calling'}</li>
            <li>
              • {t('emergency.tip4') || 'Do not move severely injured persons unless necessary'}
            </li>
            <li>• {t('emergency.tip5') || 'Keep emergency contacts handy'}</li>
          </ul>
        </motion.div>

        {userLocation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 text-center text-sm text-gray-500"
          >
            <MapPin size={16} className="inline mr-1" />
            {t('emergency.locationDetected') || 'Location detected - showing nearby hospitals'}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EmergencyHelp;
