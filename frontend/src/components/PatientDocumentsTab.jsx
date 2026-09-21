import { useEffect, useRef, useState } from 'react';
import client from '../api/client';

const DOCUMENT_TYPES = [
  { value: 'photo', label: 'Photo (e.g. scanned form)' },
  { value: 'consent', label: 'Consent form' },
  { value: 'xray', label: 'X-ray' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'medical_document', label: 'Medical document' },
  { value: 'other', label: 'Other' },
];

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB, matches backend limit

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PatientDocumentsTab({ patientId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('photo');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const fileInputRef = useRef(null);

  function load() {
    setLoading(true);
    client
      .get(`/patients/${patientId}/documents`)
      .then((res) => setDocuments(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [patientId]);

  function handleFileChange(e) {
    const selected = e.target.files[0];
    setError('');
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 15MB.');
      setFile(null);
      e.target.value = '';
      return;
    }
    setFile(selected);
    if (!title) setTitle(selected.name);
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError('');
    if (!file) {
      setError('Choose a file to upload first.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name);
      formData.append('documentType', documentType);
      await client.post(`/patients/${patientId}/documents`, formData);
      setFile(null);
      setTitle('');
      setDocumentType('photo');
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not upload this file.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc) {
    setDownloadingId(doc.id);
    try {
      const res = await client.get(
        `/patients/${patientId}/documents/${doc.id}/download`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(doc) {
    if (!window.confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
    await client.delete(`/patients/${patientId}/documents/${doc.id}`);
    load();
  }

  return (
    <div className="panel detail-panel">
      <h3 style={{ marginBottom: 4 }}>Documents</h3>
      <p className="muted small" style={{ marginBottom: 18 }}>
        Upload a photo or scan of a walk-in form, consent form, X-ray, or prescription —
        useful as a digital backup if the patient's physical copy is lost or forgotten.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleUpload} className="document-upload-form">
        <div className="form-grid">
          <div className="field span-2">
            <label>File (photo or PDF)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
              capture="environment"
              onChange={handleFileChange}
            />
            <p className="muted small" style={{ marginTop: 4 }}>
              On a phone or tablet, this can open the camera directly to capture the form on the spot.
            </p>
          </div>
          <div className="field">
            <label>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Registration form"
            />
          </div>
          <div className="field">
            <label>Type</label>
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn btn-primary btn-inline" type="submit" disabled={uploading || !file}>
          {uploading ? 'Uploading…' : 'Upload document'}
        </button>
      </form>

      <div className="document-list">
        {loading && <div className="empty-state">Loading documents…</div>}
        {!loading && documents.length === 0 && (
          <div className="empty-state">No documents uploaded yet.</div>
        )}
        {!loading && documents.length > 0 && documents.map((doc) => (
          <div className="document-row" key={doc.id}>
            <div className="document-icon">
              {doc.mime_type?.startsWith('image/') ? '🖼️' : '📄'}
            </div>
            <div className="document-info">
              <div className="document-title">{doc.title}</div>
              <div className="muted small">
                <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>
                {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                {' · '}{new Date(doc.created_at).toLocaleDateString()}
                {doc.uploaded_by_first_name ? ` · ${doc.uploaded_by_first_name} ${doc.uploaded_by_last_name}` : ''}
              </div>
            </div>
            <div className="document-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleDownload(doc)}
                disabled={downloadingId === doc.id}
              >
                {downloadingId === doc.id ? 'Downloading…' : 'Download'}
              </button>
              <button className="btn btn-text-danger btn-sm" onClick={() => handleDelete(doc)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
