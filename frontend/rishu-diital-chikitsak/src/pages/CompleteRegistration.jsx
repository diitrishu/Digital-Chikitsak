import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Calendar, Heart, Users, Plus, Send } from 'lucide-react';
import { useLanguage } from '../shared/contexts/LanguageContext';
import Header from '../shared/components/Header';
import BackButton from '../shared/components/BackButton';
import toast from 'react-hot-toast';

const CompleteRegistration = () => {
  const { t, currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Personal Info, 2: Family Members, 3: Complete
  const [userData, setUserData] = useState({
    name: '',
    age: '',
    gender: '',
    bloodGroup: '',
    phone: '',
    healthConditions: [],
    emergencyContact: ''
  });
  const [familyMembers, setFamilyMembers] = useState([]);
  const [currentMember, setCurrentMember] = useState({
    name: '',
    age: '',
    gender: '',
    relation: '',
    bloodGroup: '',
    healthConditions: [],
    medications: '',
    medicalRecords: []
  });
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const healthConditions = [
    t('register.diabetes'),
    t('register.hypertension'),
    t('register.asthma'),
    t('register.heartDisease'),
    t('register.allergies'),
    t('register.arthritis'),
    t('register.thyroid'),
    t('register.noConditions')
  ];
  const relations = [
    t('family.relations.self'),
    t('family.relations.spouse'),
    t('family.relations.father'),
    t('family.relations.mother'),
    t('family.relations.son'),
    t('family.relations.daughter'),
    t('family.relations.brother'),
    t('family.relations.sister'),
    t('family.relations.grandfather'),
    t('family.relations.grandmother'),
    t('family.relations.other')
  ];

  const handlePersonalInfoSubmit = (e) => {
    e.preventDefault();
    if (!userData.name || !userData.age || !userData.gender) {
      toast.error(t('register.fillRequired'));
      return;
    }
    setStep(2);
  };

  const handleAddFamilyMember = (e) => {
    e.preventDefault();
    if (!currentMember.name || !currentMember.age || !currentMember.gender || !currentMember.relation) {
      toast.error(t('register.fillRequired'));
      return;
    }
    
    setFamilyMembers([...familyMembers, { ...currentMember, id: Date.now() }]);
    setCurrentMember({
      name: '',
      age: '',
      gender: '',
      relation: '',
      bloodGroup: '',
      healthConditions: [],
      medications: '',
      medicalRecords: []
    });
    setShowAddMemberForm(false);
    toast.success(t('family.memberAdded'));
  };

  const removeFamilyMember = (id) => {
    setFamilyMembers(familyMembers.filter(member => member.id !== id));
    toast.success(t('family.memberDeleted'));
  };

  const completeRegistration = () => {
    // Save user data to localStorage
    localStorage.setItem('userData', JSON.stringify({
      ...userData,
      familyMembers
    }));
    
    // In a real app, you would send this data to your backend
    console.log('Registration Data:', { userData, familyMembers });
    
    setStep(3);
  };

  const finishRegistration = () => {
    navigate('/patient');
  };

  const toggleHealthCondition = (condition, isUser = true) => {
    if (isUser) {
      setUserData(prev => ({
        ...prev,
        healthConditions: prev.healthConditions.includes(condition)
          ? prev.healthConditions.filter(c => c !== condition)
          : [...prev.healthConditions, condition]
      }));
    } else {
      setCurrentMember(prev => ({
        ...prev,
        healthConditions: prev.healthConditions.includes(condition)
          ? prev.healthConditions.filter(c => c !== condition)
          : [...prev.healthConditions, condition]
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <BackButton to="/register" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= num ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {num}
                  </div>
                  {num < 3 && (
                    <div className={`w-16 h-1 mx-2 ${
                      step > num ? 'bg-teal-500' : 'bg-gray-200'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{t('register.personalInfo')}</span>
              <span>{t('family.title')}</span>
              <span>{t('common.finish')}</span>
            </div>
          </div>

          {/* Step 1: Personal Information */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {t('register.personalInfo')}
              </h2>
              
              <form onSubmit={handlePersonalInfoSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('register.name')} *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        value={userData.name}
                        onChange={(e) => setUserData({...userData, name: e.target.value})}
                        placeholder={t('register.namePlaceholder')}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('register.age')} *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="number"
                        value={userData.age}
                        onChange={(e) => setUserData({...userData, age: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('register.gender')} *
                    </label>
                    <select
                      value={userData.gender}
                      onChange={(e) => setUserData({...userData, gender: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      required
                    >
                      <option value="">{t('register.selectGender')}</option>
                      <option value={t('register.male')}>{t('register.male')}</option>
                      <option value={t('register.female')}>{t('register.female')}</option>
                      <option value={t('register.other')}>{t('register.other')}</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('register.bloodGroup')}
                    </label>
                    <select
                      value={userData.bloodGroup}
                      onChange={(e) => setUserData({...userData, bloodGroup: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="">{t('register.selectBloodGroup')}</option>
                      {bloodGroups.map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('register.mobile')}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="tel"
                        value={userData.phone}
                        onChange={(e) => setUserData({...userData, phone: e.target.value})}
                        placeholder="9876543210"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('register.emergencyContact')}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="tel"
                        value={userData.emergencyContact}
                        onChange={(e) => setUserData({...userData, emergencyContact: e.target.value})}
                        placeholder="9876543210"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('register.healthConditions')}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {healthConditions.map(condition => (
                      <button
                        key={condition}
                        type="button"
                        onClick={() => toggleHealthCondition(condition)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          userData.healthConditions.includes(condition)
                            ? 'bg-teal-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {condition}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {t('common.next')} →
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Step 2: Family Members */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {t('family.title')}
                </h2>
                <button
                  onClick={() => setShowAddMemberForm(true)}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <Plus size={18} />
                  {t('family.add')}
                </button>
              </div>
              
              {/* Family Members List */}
              {familyMembers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto text-gray-300 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    {t('family.noMembers')}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {t('family.addFirst')}
                  </p>
                  <button
                    onClick={() => setShowAddMemberForm(true)}
                    className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
                  >
                    <Plus size={18} />
                    {t('family.add')}
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {familyMembers.map(member => (
                    <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-800">{member.name}</h3>
                          <p className="text-sm text-gray-600">
                            {member.age} {t('family.age')} • {member.relation}
                          </p>
                          {member.bloodGroup && (
                            <p className="text-sm text-gray-600">
                              <Heart className="inline mr-1" size={14} />
                              {member.bloodGroup}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFamilyMember(member.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add Family Member Form */}
              {showAddMemberForm && (
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    {t('family.add')}
                  </h3>
                  
                  <form onSubmit={handleAddFamilyMember} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('family.name')} *
                        </label>
                        <input
                          type="text"
                          value={currentMember.name}
                          onChange={(e) => setCurrentMember({...currentMember, name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('family.relation')} *
                        </label>
                        <select
                          value={currentMember.relation}
                          onChange={(e) => setCurrentMember({...currentMember, relation: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          required
                        >
                          <option value="">{t('family.relation')}</option>
                          {relations.map(relation => (
                            <option key={relation} value={relation}>{relation}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('family.age')} *
                        </label>
                        <input
                          type="number"
                          value={currentMember.age}
                          onChange={(e) => setCurrentMember({...currentMember, age: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('family.gender')} *
                        </label>
                        <select
                          value={currentMember.gender}
                          onChange={(e) => setCurrentMember({...currentMember, gender: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          required
                        >
                          <option value="">{t('family.gender')}</option>
                          <option value={t('family.gender.male')}>{t('family.gender.male')}</option>
                          <option value={t('family.gender.female')}>{t('family.gender.female')}</option>
                          <option value={t('family.gender.other')}>{t('family.gender.other')}</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('family.bloodGroup')}
                        </label>
                        <select
                          value={currentMember.bloodGroup}
                          onChange={(e) => setCurrentMember({...currentMember, bloodGroup: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                          <option value="">{t('family.bloodGroup')}</option>
                          {bloodGroups.map(group => (
                            <option key={group} value={group}>{group}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('family.currentMedications')}
                      </label>
                      <textarea
                        value={currentMember.medications}
                        onChange={(e) => setCurrentMember({...currentMember, medications: e.target.value})}
                        placeholder={t('family.currentMedications')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        rows="2"
                      />
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddMemberForm(false)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg font-medium transition-colors"
                      >
                        {t('family.save')}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              
              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t border-gray-200">
                <button
                  onClick={() => setStep(1)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  ← {t('common.back')}
                </button>
                <button
                  onClick={completeRegistration}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {t('common.finish')}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Registration Complete */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-lg p-8 text-center"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="text-green-500" size={32} />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {t('register.success')}
              </h2>
              
              <p className="text-gray-600 mb-2">
                {t('register.welcome')}, {userData.name}!
              </p>
              <p className="text-gray-600 mb-6">
                {familyMembers.length > 0 
                  ? `${t('family.memberAdded')}: ${familyMembers.length}`
                  : t('family.noMembersAdded')}
              </p>
              
              <button
                onClick={finishRegistration}
                className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                {t('nav.patient')}
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CompleteRegistration;
