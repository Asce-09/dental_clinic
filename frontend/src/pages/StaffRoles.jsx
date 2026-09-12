import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal.jsx';

const EMPTY_ADD = {
  firstName: '', lastName: '', email: '', phone: '', password: '', roleId: '',
};
const EMPTY_EDIT = {
  firstName: '', lastName: '', email: '', phone: '', roleId: '',
};

export default function StaffRoles() {
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editError, setEditError] = useState('');

  const [resettingUser, setResettingUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');

  function load() {
    setLoading(true);
    Promise.all([client.get('/users'), client.get('/users/roles/list')])
      .then(([usersRes, rolesRes]) => {
        setStaff(usersRes.data);
        setRoles(rolesRes.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAddSubmit(e) {
    e.preventDefault();
    setError('');
    if (!addForm.firstName || !addForm.lastName || !addForm.email || !addForm.password || !addForm.roleId) {
      setError('All fields except phone are required.');
      return;
    }
    setSaving(true);
    try {
      await client.post('/users', addForm);
      setShowAdd(false);
      setAddForm(EMPTY_ADD);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add staff member.');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(user) {
    setEditingUser(user);
    setEditForm({
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone || '',
      roleId: user.role_id,
    });
    setEditError('');
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setEditError('');
    try {
      await client.put(`/users/${editingUser.id}`, editForm);
      setEditingUser(null);
      load();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Could not update staff member.');
    }
  }

  async function handleStatusChange(user, status) {
    await client.patch(`/users/${user.id}/status`, { status });
    load();
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    setResetError('');
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }
    try {
      await client.post(`/users/${resettingUser.id}/reset-password`, { password: newPassword });
      setResettingUser(null);
      setNewPassword('');
    } catch (err) {
      setResetError(err.response?.data?.message || 'Could not reset password.');
    }
  }

  return (
    <div>
      <div className="topbar">
        <h1>Staff & Roles</h1>
        <button className="btn btn-primary btn-inline" onClick={() => setShowAdd(true)}>
          + Add staff
        </button>
      </div>

      <div className="panel">
        {loading && <div className="empty-state">Loading staff…</div>}
        {!loading && staff.length === 0 && <div className="empty-state">No staff accounts yet.</div>}
        {!loading && staff.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Last login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u.id}>
                  <td>{u.first_name} {u.last_name}</td>
                  <td className="capitalize">{u.role_name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <select
                      className="inline-select"
                      value={u.status}
                      onChange={(e) => handleStatusChange(u, e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </td>
                  <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}</td>
                  <td className="actions-cell">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setResettingUser(u); setNewPassword(''); setResetError(''); }}
                    >
                      Reset password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <Modal title="Add staff member" onClose={() => setShowAdd(false)}>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleAddSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>First name *</label>
                <input value={addForm.firstName} onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} required />
              </div>
              <div className="field">
                <label>Last name *</label>
                <input value={addForm.lastName} onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} required />
              </div>
              <div className="field">
                <label>Email *</label>
                <input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
              </div>
              <div className="field">
                <label>Role *</label>
                <select value={addForm.roleId} onChange={(e) => setAddForm({ ...addForm, roleId: e.target.value })} required>
                  <option value="">Select a role…</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Temporary password *</label>
                <input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} required />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add staff member'}
            </button>
          </form>
        </Modal>
      )}

      {editingUser && (
        <Modal title={`Edit ${editingUser.first_name} ${editingUser.last_name}`} onClose={() => setEditingUser(null)}>
          {editError && <div className="error-banner">{editError}</div>}
          <form onSubmit={handleEditSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>First name *</label>
                <input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} required />
              </div>
              <div className="field">
                <label>Last name *</label>
                <input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} required />
              </div>
              <div className="field">
                <label>Email *</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div className="field span-2">
                <label>Role *</label>
                <select value={editForm.roleId} onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })} required>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button className="btn btn-primary" type="submit">Save changes</button>
          </form>
        </Modal>
      )}

      {resettingUser && (
        <Modal title={`Reset password — ${resettingUser.first_name} ${resettingUser.last_name}`} onClose={() => setResettingUser(null)}>
          {resetError && <div className="error-banner">{resetError}</div>}
          <form onSubmit={handleResetSubmit}>
            <div className="field">
              <label>New password *</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit">Reset password</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
