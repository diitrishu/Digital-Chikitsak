import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { Upload, FileText, Calendar, Download, Trash2, Eye, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const HealthRecords = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newRecord, setNewRecord] = useState({ title: '', date: '', type: 'report', notes: '' });

  useEffect(() => { loadHealthRecords(); }, []);

  const getToken = () => {
    const t = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (!t) { toast.error('Please login first'); navigate('/login'); }
    return t;
  };

  const loadHealthRecords = async () => {
    try {
      const token = getToken(); if (!token) return;
      const res = await fetch(`${API}/health-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setRecords(data.records || []);
      else toast.error(data.error || 'Failed to load health records');
    } catch { toast.error('Failed to load health records'); }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const k = 1024, sizes = ['Bytes','KB','MB','GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setNewRecord(p => ({ ...p, title: file.name.split('.')[0] }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !newRecord.title || !newRecord.date) {
      toast.error('Please fill all required fields and select a file'); return;
    }
    setUploading(true);
    try {
      const token = getToken(); if (!token) return;
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', newRecord.title);
      formData.append('record_type', newRecord.type);
      formData.append('record_date', newRecord.date);
      formData.append('notes', newRecord.notes);
      const res = await fetch(`${API}/health-records`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setRecords(p => [data.record, ...p]);
        setSelectedFile(null);
        setNewRecord({ title: '', date: '', type: 'report', notes: '' });
        const fi = document.getElementById('file-upload');
        if (fi) fi.value = '';
        toast.success('Health record uploaded successfully!');
      } else toast.error(data.error || 'Failed to upload');
    } catch { toast.error('Failed to upload health record'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (record) => {
    if (!window.confirm('Are you sure you want to delete this health record?')) return;
    try {
      const token = getToken(); if (!token) return;
      // id field from Supabase is 'id'
      const rid = record.id || record.record_id;
      const res = await fetch(`${API}/health-records/${rid}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRecords(p => p.filter(r => (r.id || r.record_id) !== rid));
        toast.success('Record deleted successfully!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch { toast.error('Failed to delete health record'); }
  };

  // Download/view: backend now returns a Cloudinary URL, open directly
  const handleView = async (record) => {
    const token = getToken(); if (!token) return;
    const rid = record.id || record.record_id;
    // If we already have a file_url (Cloudinary), open it directly
    if (record.file_url) { window.open(record.file_url, '_blank'); return; }
    try {
      const res = await fetch(`${API}/health-records/${rid}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.file_url) window.open(data.file_url, '_blank');
      else toast.error(data.error || 'File not available');
    } catch { toast.error('Failed to open file'); }
  };

  const handleDownload = async (record) => {
    const token = getToken(); if (!token) return;
    const rid = record.id || record.record_id;
    if (record.file_url) {
      // Cloudinary URL — trigger download via anchor
      const a = document.createElement('a');
      a.href = record.file_url;
      a.download = record.file_name || 'download';
      a.target = '_blank';
      a.click();
      return;
    }
    try {
      const res = await fetch(`${API}/health-records/${rid}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.file_url) {
        const a = document.createElement('a');
        a.href = data.file_url; a.download = data.file_name || 'download'; a.target = '_blank';
        a.click();
      } else toast.error(data.error || 'Failed to download');
    } catch { toast.error('Failed to download file'); }
  };

  const filteredRecords = records.filter(r =>
    r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.file_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFileIcon = (type) => ({ xray:'📷', prescription:'💊', vaccination:'💉' }[type] || '📄');

  return (
    <AppShell title="Health Records">
      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('healthRecords.title')}</h1>
          <p className="text-gray-600">{t('healthRecords.subtitle')}</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Plus size={20} />{t('healthRecords.uploadNewRecord')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <Upload className="mx-auto text-gray-400 mb-3" size={40} />
              <p className="text-gray-600 mb-3">{t('healthRecords.dragAndDrop')}</p>
              <label className="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                {t('healthRecords.browseFiles')}
                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
              </label>
              {selectedFile && (
                <div className="mt-3 text-sm text-gray-600">
                  <p>{selectedFile.name}</p><p>{formatFileSize(selectedFile.size)}</p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('healthRecords.recordTitle')}</label>
                <input type="text" value={newRecord.title}
                  onChange={e => setNewRecord(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={t('healthRecords.enterTitle')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('healthRecords.recordDate')}</label>
                <input type="date" value={newRecord.date}
                  onChange={e => setNewRecord(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('healthRecords.recordType')}</label>
                <select value={newRecord.type} onChange={e => setNewRecord(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="report">{t('healthRecords.types.report')}</option>
                  <option value="prescription">{t('healthRecords.types.prescription')}</option>
                  <option value="scan">{t('healthRecords.types.scan')}</option>
                  <option value="test">{t('healthRecords.types.test')}</option>
                  <option value="other">{t('healthRecords.types.other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('healthRecords.notes')}</label>
                <textarea value={newRecord.notes}
                  onChange={e => setNewRecord(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3" placeholder={t('healthRecords.addNotes')} />
              </div>
              <button onClick={handleUpload} disabled={uploading || !selectedFile}
                className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-colors ${
                  uploading || !selectedFile ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {uploading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {t('healthRecords.uploading')}
                  </span>
                ) : t('healthRecords.uploadRecord')}
              </button>
            </div>
          </div>
        </div>

        {/* Records List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText size={20} />{t('healthRecords.yourRecords')}
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder={t('healthRecords.searchRecords')} value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-700 mb-2">{t('healthRecords.noRecordsFound')}</h3>
              <p className="text-gray-500">{t('healthRecords.uploadFirstRecord')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecords.map((record) => {
                const rid = record.id || record.record_id;
                return (
                  <div key={rid} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-2xl">{getFileIcon(record.record_type)}</div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full capitalize">
                        {record.record_type}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-1 truncate">{record.title}</h3>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Calendar size={14} className="mr-1" />
                      {record.record_date ? new Date(record.record_date).toLocaleDateString() : '—'}
                    </div>
                    <div className="text-xs text-gray-500 mb-4">
                      <div className="truncate">{record.file_name}</div>
                      <div>{record.file_size}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleView(record)}
                        className="flex-1 flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 text-sm py-1">
                        <Eye size={14} />{t('healthRecords.view')}
                      </button>
                      <button onClick={() => handleDownload(record)}
                        className="flex-1 flex items-center justify-center gap-1 text-green-600 hover:text-green-800 text-sm py-1">
                        <Download size={14} />{t('healthRecords.download')}
                      </button>
                      <button onClick={() => handleDelete(record)}
                        className="flex items-center justify-center gap-1 text-red-600 hover:text-red-800 text-sm py-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default HealthRecords;
