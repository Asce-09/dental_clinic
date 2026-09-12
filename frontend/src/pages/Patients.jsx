import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Modal from '../components/Modal.jsx';

function calcAge(birthDate) {
  if (!birthDate) return '—';
  const dob = new Date(birthDate);
  const diff = Date.now() - dob.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

const EMPTY_FORM = {
  firstName: '', middleName: '', lastName: '', suffix: '',
  birthDate: '', sex: '', phone: '', email: '', address: '',
};

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load(searchTerm = search) {
    setLoading(true);
    client
      .get('/patients', { params: { search: searchTerm, limit: 50 } })
      .then((res) => setPatients(res.data.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearchSubmit(e) {
    e.preventDefault();
    load(search);
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.firstName || !form.lastName) {
      setError('First name and last name are required.');
      return;
    }
    setSaving(true);
    try {
      await client.post('/patients', form);
      setShowAdd(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add patient.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="topbar">
        <h1>Patients</h1>
        <button className="btn btn-primary btn-inline" onClick={() => setShowAdd(true)}>
          + Add patient
        </button>
      </div>

      <form className="search-row" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search by name, patient code, phone, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-secondary" type="submit">
          Search
        </button>
      </form>

      <div className="panel">
        {loading && <div className="empty-state">Loading patients…</div>}

        {!loading && patients.length === 0 && (
          <div className="empty-state">
            No patients found{search ? ` for "${search}"` : ''}. Add your first patient to get
            started.
          </div>
        )}

        {!loading && patients.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Age</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr
                  key={p.id}
                  className="row-link"
                  onClick={() => navigate(`/patients/${p.id}`)}
                >
                  <td>{p.patient_code}</td>
                  <td>
                    {p.first_name} {p.last_name}
                  </td>
                  <td>{calcAge(p.birth_date)}</td>
                  <td>{p.phone || '—'}</td>
                  <td>
                    <span className={`badge ${p.status === 'active' ? 'confirmed' : 'cancelled'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <Modal title="Add patient" onClose={() => setShowAdd(false)}>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleAddSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>First name *</label>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Last name *</label>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Middle name</label>
                <input
                  value={form.middleName}
                  onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Suffix</label>
                <input
                  value={form.suffix}
                  onChange={(e) => setForm({ ...form, suffix: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Birth date</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Sex</label>
                <select
                  value={form.sex}
                  onChange={(e) => setForm({ ...form, sex: e.target.value })}
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
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="field span-2">
                <label>Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add patient'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
