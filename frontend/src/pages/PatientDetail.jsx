import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import DentalChart from '../components/DentalChart.jsx';
import TreatmentTab from '../components/TreatmentTab.jsx';
import PortalAccessPanel from '../components/PortalAccessPanel.jsx';
import PatientDocumentsTab from '../components/PatientDocumentsTab.jsx';
import PatientAppointmentsTab from '../components/PatientAppointmentsTab.jsx';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'medical', label: 'Medical History' },
  { key: 'chart', label: 'Dental Chart' },
  { key: 'treatment', label: 'Treatment' },
  { key: 'documents', label: 'Documents' },
  { key: 'appointments', label: 'Appointments' },
];

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'];

function calcAge(birthDate) {
  if (!birthDate) return '—';
  const dob = new Date(birthDate);
  const diff = Date.now() - dob.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

function buildEditForm(patient) {
  return {
    firstName: patient.first_name || '',
    middleName: patient.middle_name || '',
    lastName: patient.last_name || '',
    suffix: patient.suffix || '',
    birthDate: patient.birth_date || '',
    sex: patient.sex || '',
    civilStatus: patient.civil_status || '',
    occupation: patient.occupation || '',
    email: patient.email || '',
    phone: patient.phone || '',
    address: patient.address || '',
    emergencyContactName: patient.emergency_contact_name || '',
    emergencyContactPhone: patient.emergency_contact_phone || '',
    emergencyContactRelationship: patient.emergency_contact_relationship || '',
  };
}

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [tab, setTab] = useState('overview');
  const [historyForm, setHistoryForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  function load() {
    client.get(`/patients/${id}`).then((res) => {
      setPatient(res.data);
      setHistoryForm({
        allergies: res.data.medicalHistory?.allergies || '',
        currentMedications: res.data.medicalHistory?.current_medications || '',
        medicalConditions: res.data.medicalHistory?.medical_conditions || '',
        previousSurgeries: res.data.medicalHistory?.previous_surgeries || '',
        familyHistory: res.data.medicalHistory?.family_history || '',
        pregnancyStatus: res.data.medicalHistory?.pregnancy_status || '',
        smokingStatus: res.data.medicalHistory?.smoking_status || '',
        alcoholUse: res.data.medicalHistory?.alcohol_use || '',
        notes: res.data.medicalHistory?.notes || '',
      });
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSaveHistory(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await client.put(`/patients/${id}/medical-history`, historyForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  function startEditing() {
    setEditForm(buildEditForm(patient));
    setEditError('');
    setEditing(true);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setEditError('');
    if (!editForm.firstName || !editForm.lastName) {
      setEditError('First name and last name are required.');
      return;
    }
    setEditSaving(true);
    try {
      await client.put(`/patients/${id}`, editForm);
      setEditing(false);
      load();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Could not save changes.');
    } finally {
      setEditSaving(false);
    }
  }

  if (!patient) {
    return <div className="empty-state">Loading patient…</div>;
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <button className="link-back" onClick={() => navigate('/patients')}>
            ← Back to patients
          </button>
          <h1>
            {patient.first_name} {patient.last_name}
          </h1>
          <p className="muted">
            {patient.patient_code} · {calcAge(patient.birth_date)} yrs
            {patient.sex ? ` · ${patient.sex.replace('_', ' ')}` : ''}
          </p>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && !editing && (
        <div className="panel detail-panel">
          <div className="panel-header" style={{ padding: 0, border: 'none', marginBottom: 18 }}>
            <h3>Patient information</h3>
            <button className="btn btn-secondary btn-sm" onClick={startEditing}>
              Edit
            </button>
          </div>
          <div className="detail-grid">
            <div>
              <span className="detail-label">Full name</span>
              <span className="detail-value">
                {patient.first_name} {patient.middle_name} {patient.last_name} {patient.suffix}
              </span>
            </div>
            <div>
              <span className="detail-label">Birth date</span>
              <span className="detail-value">{patient.birth_date || '—'}</span>
            </div>
            <div>
              <span className="detail-label">Phone</span>
              <span className="detail-value">{patient.phone || '—'}</span>
            </div>
            <div>
              <span className="detail-label">Email</span>
              <span className="detail-value">{patient.email || '—'}</span>
            </div>
            <div>
              <span className="detail-label">Civil status</span>
              <span className="detail-value">{patient.civil_status || '—'}</span>
            </div>
            <div>
              <span className="detail-label">Occupation</span>
              <span className="detail-value">{patient.occupation || '—'}</span>
            </div>
            <div className="span-2">
              <span className="detail-label">Address</span>
              <span className="detail-value">{patient.address || '—'}</span>
            </div>
            <div>
              <span className="detail-label">Emergency contact</span>
              <span className="detail-value">
                {patient.emergency_contact_name
                  ? `${patient.emergency_contact_name} (${patient.emergency_contact_relationship || '—'})`
                  : '—'}
              </span>
            </div>
            <div>
              <span className="detail-label">Emergency phone</span>
              <span className="detail-value">{patient.emergency_contact_phone || '—'}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'overview' && editing && (
        <div className="panel detail-panel">
          <div className="panel-header" style={{ padding: 0, border: 'none', marginBottom: 18 }}>
            <h3>Edit patient information</h3>
          </div>

          {editError && <div className="error-banner">{editError}</div>}

          <form onSubmit={handleEditSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>First name *</label>
                <input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Last name *</label>
                <input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Middle name</label>
                <input
                  value={editForm.middleName}
                  onChange={(e) => setEditForm({ ...editForm, middleName: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Suffix</label>
                <input
                  value={editForm.suffix}
                  onChange={(e) => setEditForm({ ...editForm, suffix: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Birth date</label>
                <input
                  type="date"
                  value={editForm.birthDate || ''}
                  onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Sex</label>
                <select
                  value={editForm.sex}
                  onChange={(e) => setEditForm({ ...editForm, sex: e.target.value })}
                >
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Civil status</label>
                <select
                  value={editForm.civilStatus}
                  onChange={(e) => setEditForm({ ...editForm, civilStatus: e.target.value })}
                >
                  <option value="">Select…</option>
                  {CIVIL_STATUS_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Occupation</label>
                <input
                  value={editForm.occupation}
                  onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                />
              </div>
              <div className="field span-2">
                <label>Address</label>
                <input
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Emergency contact name</label>
                <input
                  value={editForm.emergencyContactName}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Emergency contact phone</label>
                <input
                  value={editForm.emergencyContactPhone}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                />
              </div>
              <div className="field span-2">
                <label>Relationship</label>
                <input
                  value={editForm.emergencyContactRelationship}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContactRelationship: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary btn-inline" type="submit" disabled={editSaving}>
                {editSaving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-inline"
                onClick={() => setEditing(false)}
                disabled={editSaving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'overview' && !editing && (
        <div style={{ marginTop: 20 }}>
          <PortalAccessPanel
            patientId={id}
            portalAccess={patient.portalAccess}
            onChange={load}
          />
        </div>
      )}

      {tab === 'medical' && historyForm && (
        <div className="panel detail-panel">
          <form onSubmit={handleSaveHistory}>
            <div className="form-grid">
              <div className="field span-2">
                <label>Allergies</label>
                <input
                  value={historyForm.allergies}
                  onChange={(e) => setHistoryForm({ ...historyForm, allergies: e.target.value })}
                />
              </div>
              <div className="field span-2">
                <label>Current medications</label>
                <input
                  value={historyForm.currentMedications}
                  onChange={(e) =>
                    setHistoryForm({ ...historyForm, currentMedications: e.target.value })
                  }
                />
              </div>
              <div className="field span-2">
                <label>Medical conditions</label>
                <input
                  value={historyForm.medicalConditions}
                  onChange={(e) =>
                    setHistoryForm({ ...historyForm, medicalConditions: e.target.value })
                  }
                />
              </div>
              <div className="field span-2">
                <label>Previous surgeries</label>
                <input
                  value={historyForm.previousSurgeries}
                  onChange={(e) =>
                    setHistoryForm({ ...historyForm, previousSurgeries: e.target.value })
                  }
                />
              </div>
              <div className="field span-2">
                <label>Family history</label>
                <input
                  value={historyForm.familyHistory}
                  onChange={(e) => setHistoryForm({ ...historyForm, familyHistory: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Pregnancy status</label>
                <input
                  value={historyForm.pregnancyStatus}
                  onChange={(e) =>
                    setHistoryForm({ ...historyForm, pregnancyStatus: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>Smoking status</label>
                <input
                  value={historyForm.smokingStatus}
                  onChange={(e) => setHistoryForm({ ...historyForm, smokingStatus: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Alcohol use</label>
                <input
                  value={historyForm.alcoholUse}
                  onChange={(e) => setHistoryForm({ ...historyForm, alcoholUse: e.target.value })}
                />
              </div>
              <div className="field span-2">
                <label>Notes</label>
                <input
                  value={historyForm.notes}
                  onChange={(e) => setHistoryForm({ ...historyForm, notes: e.target.value })}
                />
              </div>
            </div>
            <button className="btn btn-primary btn-inline" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save medical history'}
            </button>
            {saved && <span className="save-confirmed">Saved</span>}
          </form>
        </div>
      )}

      {tab === 'chart' && (
        <div className="panel detail-panel">
          <DentalChart patientId={id} />
        </div>
      )}

      {tab === 'treatment' && <TreatmentTab patientId={id} />}

      {tab === 'documents' && <PatientDocumentsTab patientId={id} />}

      {tab === 'appointments' && <PatientAppointmentsTab patientId={id} />}
    </div>
  );
}
