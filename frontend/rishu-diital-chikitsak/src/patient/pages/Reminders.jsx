import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { Plus, Clock, Bell, Trash2, Edit, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const MedicationReminders = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    medicineName: '', dosage: '', frequency: 'once',
    time: '', startDate: '', endDate: '', notes: ''
  });

  useEffect(() => { loadReminders(); }, []);

  const getToken = () => {
    const tk = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (!tk) { toast.error('Please login first'); navigate('/login'); }
    return tk;
  };

  // Supabase returns 'id', old MySQL returned 'reminder_id' — handle both
  const getId = (r) => r.id || r.reminder_id;

  const loadReminders = async () => {
    try {
      const token = getToken(); if (!token) return;
      const res = await fetch(`${API}/medication-reminders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setReminders(data.reminders || []);
      else toast.error(data.error || 'Failed to load reminders');
    } catch { toast.error('Failed to load medication reminders'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.medicineName || !formData.dosage || !formData.time) {
      toast.error('Please fill all required fields'); return;
    }
    try {
      const token = getToken(); if (!token) return;
      let timeSlots = [formData.time];
      if (formData.frequency === 'twice') timeSlots = [formData.time, '20:00'];
      else if (formData.frequency === 'thrice') timeSlots = [formData.time, '14:00', '20:00'];
      else if (formData.frequency === 'fourTimes') timeSlots = [formData.time, '12:00', '16:00', '20:00'];

      const body = {
        medicine_name: formData.medicineName, dosage: formData.dosage,
        frequency: formData.frequency, time_slots: timeSlots,
        start_date: formData.startDate || null, end_date: formData.endDate || null,
        notes: formData.notes
      };

      const url = editingId ? `${API}/medication-reminders/${editingId}` : `${API}/medication-reminders`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        const saved = data.reminder;
        if (editingId) {
          setReminders(p => p.map(r => getId(r) === editingId ? saved : r));
          toast.success('Reminder updated!');
        } else {
          setReminders(p => [saved, ...p]);
          toast.success('Reminder created!');
        }
        setFormData({ medicineName:'', dosage:'', frequency:'once', time:'', startDate:'', endDate:'', notes:'' });
        setShowForm(false); setEditingId(null);
      } else toast.error(data.error || 'Failed to save reminder');
    } catch { toast.error('Failed to save medication reminder'); }
  };

  const handleEdit = (r) => {
    setFormData({
      medicineName: r.medicine_name, dosage: r.dosage, frequency: r.frequency,
      time: Array.isArray(r.time_slots) && r.time_slots.length ? r.time_slots[0] : '',
      startDate: r.start_date || '', endDate: r.end_date || '', notes: r.notes || ''
    });
    setEditingId(getId(r)); setShowForm(true);
  };

  const handleDelete = async (r) => {
    if (!window.confirm(t('medications.deleteConfirm'))) return;
    try {
      const token = getToken(); if (!token) return;
      const res = await fetch(`${API}/medication-reminders/${getId(r)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setReminders(p => p.filter(x => getId(x) !== getId(r)));
        toast.success('Reminder deleted!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch { toast.error('Failed to delete reminder'); }
  };

  const markAsTaken = async (r) => {
    try {
      const token = getToken(); if (!token) return;
      const res = await fetch(`${API}/medication-reminders/${getId(r)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_taken: new Date().toISOString() })
      });
      if (res.ok) {
        const data = await res.json();
        setReminders(p => p.map(x => getId(x) === getId(r) ? data.reminder : x));
        toast.success('Marked as taken!');
      }
    } catch { toast.error('Failed to mark as taken'); }
  };

  const freqText = (f) => ({
    once: t('medications.frequencies.once'), twice: t('medications.frequencies.twice'),
    thrice: t('medications.frequencies.thrice'), fourTimes: t('medications.frequencies.fourTimes')
  }[f] || f);

  const resetForm = () => {
    setFormData({ medicineName:'', dosage:'', frequency:'once', time:'', startDate:'', endDate:'', notes:'' });
    setShowForm(false); setEditingId(null);
  };

  return (
    <AppShell title="Medication Reminders">
      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('medications.title')}</h1>
            <p className="text-gray-600">{t('medications.subtitle')}</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus size={20} />{t('medications.addReminder')}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? t('medications.editReminder') : t('medications.addNewReminder')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.medicineName')} *</label>
                  <input type="text" value={formData.medicineName}
                    onChange={e => setFormData(p => ({ ...p, medicineName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('medications.medicineNamePlaceholder')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.dosage')} *</label>
                  <input type="text" value={formData.dosage}
                    onChange={e => setFormData(p => ({ ...p, dosage: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('medications.dosagePlaceholder')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.frequency')} *</label>
                  <select value={formData.frequency}
                    onChange={e => setFormData(p => ({ ...p, frequency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="once">{t('medications.frequencies.once')}</option>
                    <option value="twice">{t('medications.frequencies.twice')}</option>
                    <option value="thrice">{t('medications.frequencies.thrice')}</option>
                    <option value="fourTimes">{t('medications.frequencies.fourTimes')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.firstTime')} *</label>
                  <input type="time" value={formData.time}
                    onChange={e => setFormData(p => ({ ...p, time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.startDate')}</label>
                  <input type="date" value={formData.startDate}
                    onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.endDate')}</label>
                  <input type="date" value={formData.endDate}
                    onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.notes')}</label>
                <textarea value={formData.notes}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3" placeholder={t('medications.notesPlaceholder')} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                  {editingId ? t('medications.updateReminder') : t('medications.addReminder')}
                </button>
                <button type="button" onClick={resetForm}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400">
                  {t('medications.cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Bell size={20} />{t('medications.yourReminders')}
          </h2>
          {reminders.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-700 mb-2">{t('medications.noReminders')}</h3>
              <p className="text-gray-500">{t('medications.addFirstReminder')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reminders.map((r) => (
                <div key={getId(r)}
                  className={`border rounded-lg p-4 ${r.active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-800">{r.medicine_name}</h3>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(r)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(r)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div><span className="font-medium">{t('medications.dosage')}:</span> {r.dosage}</div>
                    <div><span className="font-medium">{t('medications.frequency')}:</span> {freqText(r.frequency)}</div>
                    <div><span className="font-medium">{t('medications.times')}:</span> {Array.isArray(r.time_slots) ? r.time_slots.join(', ') : t('medications.notSet')}</div>
                    {r.start_date && <div><span className="font-medium">{t('medications.startDate')}:</span> {r.start_date}{r.end_date && ` → ${r.end_date}`}</div>}
                    {r.notes && <div><span className="font-medium">{t('medications.notes')}:</span> {r.notes}</div>}
                    {r.last_taken && <div><span className="font-medium">{t('medications.lastTaken')}:</span> {new Date(r.last_taken).toLocaleString()}</div>}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => markAsTaken(r)}
                      className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 flex items-center justify-center gap-1">
                      <CheckCircle size={16} />{t('medications.markTaken')}
                    </button>
                    <span className={`px-3 py-2 rounded text-sm ${r.active ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                      {r.active ? t('medications.active') : t('medications.inactive')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default MedicationReminders;
