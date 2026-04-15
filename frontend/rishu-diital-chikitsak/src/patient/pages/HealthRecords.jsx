import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { Upload, FileText, Calendar, Download, Trash2, Eye, Plus, Search, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const API              = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const MAX_FILE_BYTES   = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES    = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif',
                          'application/msword',
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_EXT_LABEL = 'PDF, JPG, PNG, GIF, DOC, DOCX';

// ── Upload file via Flask backend → Cloudinary (avoids browser SSL issues) ───
async function uploadHealthRecord(token, file, metadata, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', metadata.title);
    formData.append('record_type', metadata.type);
    formData.append('record_date', metadata.date);
    formData.append('notes', metadata.notes || '');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API}/health-records`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data.record);
        } else {
          reject(new Error(data.error || `Upload failed (HTTP ${xhr.status})`));
        }
      } catch {
        reject(new Error(`Server error (HTTP ${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error. Check that the backend is running on port 5000.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. Try a smaller file.'));
    xhr.timeout = 120000; // 2 min timeout for large files

    xhr.send(formData);
  });
}

const HealthRecords = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [records, setRecords]       = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newRecord, setNewRecord]   = useState({ title: '', date: '', type: 'report', notes: '' });

  useEffect(() => { loadHealthRecords(); }, []);

  const getToken = () => {
    const tok = localStorage.getItem('token');
    if (!tok) { toast.error('Please login first'); navigate('/login'); }
    return tok;
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
    } catch {
      toast.error('Failed to load health records');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`Unsupported file type. Allowed: ${ALLOWED_EXT_LABEL}`);
      e.target.value = '';
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_BYTES) {
      toast.error('File too large. Maximum size is 20 MB.');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    // Auto-fill title from filename (strip extension)
    setNewRecord(p => ({ ...p, title: file.name.replace(/\.[^/.]+$/, '') }));
  };

  const handleUpload = async () => {
    if (!selectedFile) { toast.error('Please select a file'); return; }
    if (!newRecord.title.trim()) { toast.error('Please enter a title'); return; }
    if (!newRecord.date) { toast.error('Please select a record date'); return; }

    const token = getToken(); if (!token) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Single step: file goes to Flask → Cloudinary → URL saved to Supabase
      const record = await uploadHealthRecord(
        token,
        selectedFile,
        { title: newRecord.title.trim(), type: newRecord.type, date: newRecord.date, notes: newRecord.notes },
        setUploadProgress
      );

      setRecords(p => [record, ...p]);
      setSelectedFile(null);
      setNewRecord({ title: '', date: '', type: 'report', notes: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadProgress(0);
      toast.success('Health record uploaded successfully!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm('Delete this health record?')) return;
    const token = getToken(); if (!token) return;
    const rid = record.id || record.record_id;
    try {
      const res = await fetch(`${API}/health-records/${rid}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRecords(p => p.filter(r => (r.id || r.record_id) !== rid));
        toast.success('Record deleted');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch { toast.error('Failed to delete health record'); }
  };

  const handleView = (record) => {
    if (record.file_url) { window.open(record.file_url, '_blank'); return; }
    toast.error('File URL not available');
  };

  const handleDownload = (record) => {
    if (!record.file_url) { toast.error('File URL not available'); return; }
    const a = document.createElement('a');
    a.href = record.file_url;
    a.download = record.file_name || 'health-record';
    a.target = '_blank';
    a.click();
  };

  const filteredRecords = records.filter(r =>
    r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.file_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFileIcon = (type) => ({ xray: '📷', prescription: '💊', vaccination: '💉', scan: '🔬', test: '🧪' }[type] || '📄');

  return (
    <AppShell title="Health Records">
      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('healthRecords.title')}</h1>
          <p className="text-gray-600">{t('healthRecords.subtitle')}</p>
        </div>

        {/* ── Upload Section ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Plus size={20} /> {t('healthRecords.uploadNewRecord')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Drop zone */}
            <div>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer
                  ${selectedFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="space-y-2">
                    <CheckCircle className="mx-auto text-green-500" size={40} />
                    <p className="font-medium text-green-700 truncate">{selectedFile.name}</p>
                    <p className="text-sm text-green-600">{formatFileSize(selectedFile.size)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mx-auto"
                    >
                      <X size={12} /> Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto text-gray-400 mb-3" size={40} />
                    <p className="text-gray-600 mb-1">{t('healthRecords.dragAndDrop')}</p>
                    <p className="text-xs text-gray-400 mb-3">{ALLOWED_EXT_LABEL} · Max 20 MB</p>
                    <span className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                      {t('healthRecords.browseFiles')}
                    </span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                onChange={handleFileChange}
              />

              {/* Upload progress bar */}
              {uploading && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Uploading to Cloudinary…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Metadata form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('healthRecords.recordTitle')} *
                </label>
                <input
                  type="text"
                  value={newRecord.title}
                  onChange={e => setNewRecord(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={t('healthRecords.enterTitle')}
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('healthRecords.recordDate')} *
                </label>
                <input
                  type="date"
                  value={newRecord.date}
                  onChange={e => setNewRecord(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('healthRecords.recordType')}
                </label>
                <select
                  value={newRecord.type}
                  onChange={e => setNewRecord(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={uploading}
                >
                  <option value="report">{t('healthRecords.types.report')}</option>
                  <option value="prescription">{t('healthRecords.types.prescription')}</option>
                  <option value="scan">{t('healthRecords.types.scan')}</option>
                  <option value="test">{t('healthRecords.types.test')}</option>
                  <option value="xray">X-Ray</option>
                  <option value="vaccination">Vaccination</option>
                  <option value="other">{t('healthRecords.types.other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('healthRecords.notes')}
                </label>
                <textarea
                  value={newRecord.notes}
                  onChange={e => setNewRecord(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="3"
                  placeholder={t('healthRecords.addNotes')}
                  disabled={uploading}
                />
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className={`w-full py-2.5 px-4 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2
                  ${uploading || !selectedFile ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    {uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : 'Saving…'}
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    {t('healthRecords.uploadRecord')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Records List ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText size={20} /> {t('healthRecords.yourRecords')}
              {records.length > 0 && (
                <span className="text-sm font-normal text-gray-400">({records.length})</span>
              )}
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={t('healthRecords.searchRecords')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
                  <div key={rid} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-2xl">{getFileIcon(record.record_type)}</div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full capitalize">
                        {record.record_type}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-1 truncate" title={record.title}>
                      {record.title}
                    </h3>
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                      <Calendar size={13} className="mr-1 flex-shrink-0" />
                      {record.record_date ? new Date(record.record_date).toLocaleDateString() : '—'}
                    </div>
                    <div className="text-xs text-gray-400 mb-4 space-y-0.5">
                      <div className="truncate" title={record.file_name}>{record.file_name}</div>
                      {record.file_size && <div>{record.file_size}</div>}
                    </div>
                    <div className="flex gap-2 border-t border-gray-100 pt-3">
                      <button
                        onClick={() => handleView(record)}
                        className="flex-1 flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 text-sm py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Eye size={14} /> {t('healthRecords.view')}
                      </button>
                      <button
                        onClick={() => handleDownload(record)}
                        className="flex-1 flex items-center justify-center gap-1 text-green-600 hover:text-green-800 text-sm py-1 rounded-lg hover:bg-green-50 transition-colors"
                      >
                        <Download size={14} /> {t('healthRecords.download')}
                      </button>
                      <button
                        onClick={() => handleDelete(record)}
                        className="flex items-center justify-center px-2 text-red-500 hover:text-red-700 text-sm py-1 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
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
