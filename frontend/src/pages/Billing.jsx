import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Modal from '../components/Modal.jsx';
import PatientPicker from '../components/PatientPicker.jsx';

function money(n) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);
}

const STATUS_FILTERS = ['', 'unpaid', 'partially_paid', 'paid', 'draft', 'void'];
const EMPTY_ITEM = { treatmentId: '', description: '', quantity: 1, unitPrice: 0 };

export default function Billing() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [patient, setPatient] = useState(null);
  const [plans, setPlans] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    client
      .get('/invoices', { params: status ? { status } : {} })
      .then((res) => setInvoices(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [status]);

  useEffect(() => {
    client.get('/lookups/treatments').then((res) => setTreatments(res.data));
  }, []);

  useEffect(() => {
    if (!patient) {
      setPlans([]);
      return;
    }
    client.get('/treatment-plans', { params: { patientId: patient.id } }).then((res) => setPlans(res.data));
  }, [patient]);

  function resetForm() {
    setPatient(null);
    setItems([]);
    setNewItem(EMPTY_ITEM);
    setDiscount(0);
    setTax(0);
    setDueDate('');
    setNotes('');
    setError('');
  }

  function addRow() {
    if (!newItem.description) return;
    setItems([...items, newItem]);
    setNewItem(EMPTY_ITEM);
  }

  function removeRow(idx) {
    setItems(items.filter((_, i) => i !== idx));
  }

  async function loadPlanItems(planId) {
    const res = await client.get(`/treatment-plans/${planId}`);
    const loaded = res.data.items
      .filter((it) => it.status !== 'cancelled')
      .map((it) => ({
        treatmentId: it.treatment_id || '',
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unit_price,
      }));
    setItems([...items, ...loaded]);
  }

  const subtotal = items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0);
  const total = Math.max(0, subtotal - Number(discount || 0) + Number(tax || 0));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!patient) {
      setError('Select a patient first.');
      return;
    }
    if (!items.length) {
      setError('Add at least one line item.');
      return;
    }
    setSaving(true);
    try {
      await client.post('/invoices', {
        patientId: patient.id, dueDate: dueDate || null, discount, tax, notes, items,
      });
      setShowCreate(false);
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create invoice.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="topbar">
        <h1>Billing & Invoices</h1>
        <button
          className="btn btn-primary btn-inline"
          onClick={() => {
            resetForm();
            setShowCreate(true);
          }}
        >
          + New invoice
        </button>
      </div>

      <div className="filter-row">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || 'all'}
            className={`filter-chip${status === s ? ' active' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      <div className="panel">
        {loading && <div className="empty-state">Loading invoices…</div>}
        {!loading && invoices.length === 0 && <div className="empty-state">No invoices found.</div>}
        {!loading && invoices.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Patient</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="row-link" onClick={() => navigate(`/billing/${inv.id}`)}>
                  <td>{inv.invoice_number}</td>
                  <td>{inv.patient_first_name} {inv.patient_last_name}</td>
                  <td>{money(inv.total)}</td>
                  <td>{money(inv.amount_paid)}</td>
                  <td><span className={`badge ${inv.status === 'paid' ? 'confirmed' : inv.status === 'void' ? 'cancelled' : 'pending'}`}>{inv.status.replace('_', ' ')}</span></td>
                  <td>{inv.due_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <Modal title="New invoice" onClose={() => setShowCreate(false)} width={680}>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <PatientPicker onSelect={setPatient} />

            {patient && plans.length > 0 && (
              <div className="field">
                <label>Load items from a treatment plan (optional)</label>
                <select defaultValue="" onChange={(e) => e.target.value && loadPlanItems(e.target.value)}>
                  <option value="">Select a plan to pull its items…</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.title} — {money(p.total_estimated)}</option>
                  ))}
                </select>
              </div>
            )}

            <h5>Line items</h5>
            {items.length > 0 && (
              <table className="mini-table">
                <thead>
                  <tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Total</th><th></th></tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td>{it.description}</td>
                      <td>{it.quantity}</td>
                      <td>{money(it.unitPrice)}</td>
                      <td>{money(Number(it.quantity) * Number(it.unitPrice))}</td>
                      <td>
                        <button type="button" className="btn btn-text-danger btn-sm" onClick={() => removeRow(idx)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="item-add-row">
              <input
                placeholder="Description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
              <select
                value={newItem.treatmentId}
                onChange={(e) => {
                  const t = treatments.find((tr) => String(tr.id) === e.target.value);
                  setNewItem({
                    ...newItem,
                    treatmentId: e.target.value,
                    description: newItem.description || t?.name || '',
                    unitPrice: t ? t.default_price : newItem.unitPrice,
                  });
                }}
              >
                <option value="">Treatment</option>
                {treatments.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <input
                type="number" min="1" step="1" placeholder="Qty"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
              />
              <input
                type="number" min="0" step="0.01" placeholder="Unit price"
                value={newItem.unitPrice}
                onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
                Add row
              </button>
            </div>

            <div className="form-grid" style={{ marginTop: 16 }}>
              <div className="field">
                <label>Discount</label>
                <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="field">
                <label>Tax</label>
                <input type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
              </div>
              <div className="field">
                <label>Due date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="field span-2">
                <label>Notes</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="invoice-total-row">
              <span>Subtotal: {money(subtotal)}</span>
              <span>Total: <strong>{money(total)}</strong></span>
            </div>

            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create invoice'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
