import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import api from "../../shared/services/api";
import { 
  Plus, 
  User, 
  Calendar, 
  Phone, 
  Stethoscope, 
  Pill, 
  History, 
  Camera, 
  Edit3, 
  Trash2,
  Heart,
  Activity,
  FileText,
  Send
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useLanguage } from '../../shared/contexts/LanguageContext';

export default function FamilyMembers() {
  const { t } = useLanguage();
  const [members, setMembers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState({ 
    name: "", 
    age: "", 
    gender: "", 
    blood_group: "",
    relation: "",
    phone: "",
    medical_history: "",
    current_medications: "",
    profile_image: null
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const genders = [
    t('family.gender.male'),
    t('family.gender.female'),
    t('family.gender.other')
  ];

  async function loadMembers() {
    try {
      const data = await api.getPatients();
      setMembers(data || []);
    } catch (error) {
      console.error("Failed to load family members:", error);
      toast.error(`${t('common.error')}: ${error.message || 'Failed to load family members'}`);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast.error(t('family.name') + " " + t('register.fillRequired'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.addPatient(form);
      
      toast.success(t('family.memberAdded'));
      setForm({ 
        name: "", 
        age: "", 
        gender: "", 
        blood_group: "",
        relation: "",
        phone: "",
        medical_history: "",
        current_medications: "",
        profile_image: null
      });
      setShowAddForm(false);
      loadMembers();
    } catch (error) {
      console.error("Failed to add family member:", error);
      toast.error(`${t('common.error')}: ${error.message || 'Failed to add family member'}`);
    } finally {
      setLoading(false);
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, profile_image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const navigateToBookDoctor = (member) => {
    // Store selected member in localStorage for BookDoctor page
    localStorage.setItem('selectedPatient', JSON.stringify(member));
    navigate('/patient/book-doctor');
  };

  const navigateToPharmacy = (member) => {
    // Store selected member in localStorage for Pharmacy page
    localStorage.setItem('selectedPatient', JSON.stringify(member));
    navigate('/patient/pharmacy');
  };

  const navigateToSymptomChecker = (member) => {
    // Store selected member in localStorage for Symptom Checker
    localStorage.setItem('selectedPatient', JSON.stringify(member));
    navigate('/patient/symptom-checker');
  };

  // Send member details to doctor — navigates to book doctor with member pre-selected
  const sendToDoctor = (member) => {
    localStorage.setItem('selectedPatient', JSON.stringify(member));
    navigate('/patient/book-doctor');
    toast.success(`${t('family.sendToDoctor')} ${member.name}`);
  };

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error(t('register.loginFirst'));
      return;
    }
    
    loadMembers();
  }, []);

  return (
    <AppShell title="Family">
      <div className="max-w-6xl mx-auto px-4 py-5">
      <Toaster position="top-center" />
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  {t('family.title')}
                </h1>
                <p className="text-gray-600">
                  {t('dashboard.familyDesc')}
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
              >
                <Plus size={20} />
                {t('family.add')}
              </button>
            </div>

            {/* Family Members Grid */}
            {members.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <User size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('family.noMembers')}</h3>
                <p className="text-gray-500 mb-6">{t('family.addFirst')}</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium mx-auto"
                >
                  <Plus size={20} />
                  {t('family.add')}
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {members.map((member) => (
                  <motion.div
                    key={member.id || member.patient_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-6"
                  >
                    {/* Profile Section */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                        {member.profile_image ? (
                          <img 
                            src={member.profile_image} 
                            alt={member.name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          member.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-800">{member.name}</h3>
                        <p className="text-sm text-gray-600">
                          {member.age ? `${member.age} ${t('family.age')}` : t('register.age') + ' ' + t('register.notSpecified')} • {member.gender || t('family.gender') + ' ' + t('register.notSpecified')}
                        </p>
                        <p className="text-xs text-blue-600 font-medium">
                          {member.relation || t('family.relation') + ' ' + t('register.notSpecified')}
                        </p>
                      </div>
                    </div>

                    {/* Health Info */}
                    <div className="space-y-2 mb-6">
                      {member.blood_group && (
                        <div className="flex items-center gap-2 text-sm">
                          <Heart className="text-red-500" size={16} />
                          <span className="text-gray-600">{t('family.bloodGroup')}:</span>
                          <span className="font-medium">{member.blood_group}</span>
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="text-green-500" size={16} />
                          <span className="text-gray-600">{t('family.phone')}:</span>
                          <span className="font-medium">{member.phone}</span>
                        </div>
                      )}
                      {member.current_medications && (
                        <div className="flex items-center gap-2 text-sm">
                          <Pill className="text-orange-500" size={16} />
                          <span className="text-gray-600">{t('family.currentMedications')}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => navigateToBookDoctor(member)}
                        className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        <Stethoscope size={16} />
                        {t('family.bookDoctor')}
                      </button>
                      <button
                        onClick={() => navigateToPharmacy(member)}
                        className="flex items-center justify-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                      >
                        <Pill size={16} />
                        {t('family.findPharmacy')}
                      </button>
                      <button
                        onClick={() => navigateToSymptomChecker(member)}
                        className="flex items-center justify-center gap-2 bg-purple-50 text-purple-700 px-4 py-3 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                      >
                        <Activity size={16} />
                        {t('family.checkSymptoms')}
                      </button>
                      <button
                        onClick={() => setSelectedMember(member)}
                        className="flex items-center justify-center gap-2 bg-gray-50 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                      >
                        <FileText size={16} />
                        {t('family.viewRecords')}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Add Member Modal */}
            <AnimatePresence>
              {showAddForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">
                          {t('family.add')}
                        </h2>
                        <button
                          onClick={() => setShowAddForm(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>

                      <form onSubmit={handleAdd} className="space-y-6">
                        {/* Profile Image */}
                        <div className="text-center">
                          <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                            {form.profile_image ? (
                              <img 
                                src={form.profile_image} 
                                alt="Profile"
                                className="w-24 h-24 object-cover"
                              />
                            ) : (
                              <Camera className="text-gray-400" size={32} />
                            )}
                          </div>
                          <label className="cursor-pointer bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                            <Camera size={16} className="inline mr-2" />
                            {t('family.profileImage')}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Basic Info */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('family.name')} *
                            </label>
                            <input
                              type="text"
                              placeholder={t('family.name')}
                              value={form.name}
                              onChange={(e) => setForm({ ...form, name: e.target.value })}
                              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('family.relation')}
                            </label>
                            <select
                              value={form.relation}
                              onChange={(e) => setForm({ ...form, relation: e.target.value })}
                              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">{t('family.relation')}</option>
                              {relations.map((relation, index) => (
                                <option key={relation} value={relation}>{relation}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('family.age')}
                            </label>
                            <input
                              type="number"
                              placeholder={t('family.age')}
                              value={form.age}
                              onChange={(e) => setForm({ ...form, age: e.target.value })}
                              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('family.gender')}
                            </label>
                            <select
                              value={form.gender}
                              onChange={(e) => setForm({ ...form, gender: e.target.value })}
                              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">{t('family.gender')}</option>
                              {genders.map((gender, index) => (
                                <option key={gender} value={gender}>{gender}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('family.bloodGroup')}
                            </label>
                            <select
                              value={form.blood_group}
                              onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">{t('family.bloodGroup')}</option>
                              {bloodGroups.map(group => (
                                <option key={group} value={group}>{group}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('family.phone')}
                          </label>
                          <input
                            type="tel"
                            placeholder={t('family.phone')}
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                            className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('family.currentMedications')}
                          </label>
                          <textarea
                            placeholder={t('family.currentMedications')}
                            value={form.current_medications}
                            onChange={(e) => setForm({ ...form, current_medications: e.target.value })}
                            className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 resize-none"
                            rows="3"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('family.medicalHistory')}
                          </label>
                          <textarea
                            placeholder={t('family.medicalHistory')}
                            value={form.medical_history}
                            onChange={(e) => setForm({ ...form, medical_history: e.target.value })}
                            className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 resize-none"
                            rows="3"
                          />
                        </div>

                        <div className="flex gap-4 pt-4">
                          <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {loading ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                              <>
                                <Plus size={18} />
                                {t('family.add')}
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Member Details Modal */}
            <AnimatePresence>
              {selectedMember && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">
                          {selectedMember.name} - {t('records.title')}
                        </h2>
                        <button
                          onClick={() => setSelectedMember(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="font-semibold mb-3">{t('family.basicInfo')}</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">{t('family.age')}:</span>
                              <span className="ml-2 font-medium">{selectedMember.age || t('register.notSpecified')}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">{t('family.gender')}:</span>
                              <span className="ml-2 font-medium">{selectedMember.gender || t('register.notSpecified')}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">{t('family.bloodGroup')}:</span>
                              <span className="ml-2 font-medium">{selectedMember.blood_group || t('register.notSpecified')}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">{t('family.phone')}:</span>
                              <span className="ml-2 font-medium">{selectedMember.phone || t('register.notSpecified')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Medical History */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h3 className="font-semibold mb-3">{t('family.medicalHistory')}</h3>
                          <p className="text-sm text-gray-700">
                            {selectedMember.medical_history || t('register.noData')}
                          </p>
                        </div>

                        {/* Current Medications */}
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h3 className="font-semibold mb-3">{t('family.currentMedications')}</h3>
                          <p className="text-sm text-gray-700">
                            {selectedMember.current_medications || t('register.noData')}
                          </p>
                        </div>

                        {/* Send to Doctor Button */}
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <button
                            onClick={() => sendToDoctor(selectedMember)}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                          >
                            <Send size={18} />
                            {t('family.sendToDoctor')}
                          </button>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={() => {
                              setSelectedMember(null);
                              navigateToBookDoctor(selectedMember);
                            }}
                            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            <Stethoscope size={16} />
                            {t('family.bookDoctor')}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMember(null);
                              navigateToPharmacy(selectedMember);
                            }}
                            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            <Pill size={16} />
                            {t('family.findPharmacy')}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMember(null);
                              navigateToSymptomChecker(selectedMember);
                            }}
                            className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                          >
                            <Activity size={16} />
                            {t('family.checkSymptoms')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </AppShell>
  );
}
