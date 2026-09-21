import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Modal from '../components/Modal.jsx';
import PatientsByDay from '../components/PatientsByDay.jsx';

function calcAge(birthDate) {
  if (!birthDate) return '—';
  const dob = new Date(birthDate);
  const diff = Date.now() - dob.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

const EMPTY_FILTERS = { status: '', sex: '', ageGroup: '' };

const EMPTY_FORM = {
  firstName: '', middleName: '', lastName: '', suffix: '',
  birthDate: '', sex: '', phone: '', email: '', address: '',
};

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [view, setView] = useState('all'); // 'all' | 'day'
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState('newest');
  const [pageSize, setPageSize] = useState(25); // number, or 'all'
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeFilterCount =
    Object.values(filters).filter(Boolean).length + (appliedSearch ? 1 : 0);

  function load() {
    setLoading(true);
    client
      .get('/patients', {
        params: {
          search: appliedSearch,
          status: filters.status,
          sex: filters.sex,
          ageGroup: filters.ageGroup,
          sort,
          page,
          limit: pageSize,
        },
      })
      .then((res) => {
        setPatients(res.data.data);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSearch, filters, sort, pageSize, page]);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setAppliedSearch(search.trim());
    setPage(1);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSearch('');
    setAppliedSearch('');
    setPage(1);
  }

  const showingAll = pageSize === 'all';
  const totalPages = showingAll ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : showingAll ? 1 : (page - 1) * pageSize + 1;
  const rangeEnd = showingAll ? total : Math.min(page * pageSize, total);

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
      setSort('newest');
      setPage(1);
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

      <div className="filter-row">
        <button
          className={`filter-chip${view === 'all' ? ' active' : ''}`}
          onClick={() => setView('all')}
        >
          All patients
        </button>
        <button
          className={`filter-chip${view === 'day' ? ' active' : ''}`}
          onClick={() => setView('day')}
        >
          By appointment day
        </button>
      </div>

      {view === 'day' && <PatientsByDay />}

      {view === 'all' && (
        <>
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

          <div className="list-filters">
            <div className="list-filter">
              <label>Status</label>
              <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="list-filter">
              <label>Age group</label>
              <select value={filters.ageGroup} onChange={(e) => updateFilter('ageGroup', e.target.value)}>
                <option value="">All ages</option>
                <option value="child">Children (0–12)</option>
                <option value="teen">Teens (13–17)</option>
                <option value="adult">Adults (18–59)</option>
                <option value="senior">Seniors (60+)</option>
                <option value="unknown">No birth date</option>
              </select>
            </div>
            <div className="list-filter">
              <label>Sex</label>
              <select value={filters.sex} onChange={(e) => updateFilter('sex', e.target.value)}>
                <option value="">All</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div className="list-filter">
              <label>Sort by</label>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name (A–Z)</option>
                <option value="code">Patient code</option>
              </select>
            </div>
            <div className="list-filter">
              <label>Show</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
                <option value="all">All patients</option>
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button type="button" className="btn btn-text-danger btn-sm" onClick={clearFilters}>
                Clear filters ({activeFilterCount})
              </button>
            )}
          </div>

          <div className="panel">
            {loading && <div className="empty-state">Loading patients…</div>}

            {!loading && patients.length === 0 && (
              <div className="empty-state">
                {activeFilterCount > 0
                  ? 'No patients match these filters.'
                  : 'No patients found. Add your first patient to get started.'}
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

          {total > 0 && (
            <div className="pagination-bar">
              <span className="muted">
                Showing {rangeStart}–{rangeEnd} of {total} patient{total === 1 ? '' : 's'}
              </span>
              {!showingAll && totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    ← Prev
                  </button>
                  <span className="pagination-page">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

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
