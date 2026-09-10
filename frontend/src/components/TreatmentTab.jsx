import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from './Modal.jsx';

function money(n) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);
}

const EMPTY_PLAN_FORM = { title: '', diagnosis: '', notes: '' };
const EMPTY_ITEM_FORM = { treatmentId: '', toothId: '', description: '', quantity: 1, unitPrice: 0 };
const EMPTY_RECORD_FORM = {
  treatmentId: '', toothId: '', dentistId: '', diagnosis: '', procedureNotes: '',
  prescription: '', followUpDate: '',
};

const PLAN_STATUSES = ['proposed', 'accepted', 'in_progress', 'completed', 'cancelled'];
const ITEM_STATUSES = ['planned', 'approved', 'in_progress', 'completed', 'cancelled'];

export default function TreatmentTab({ patientId }) {
  const [plans, setPlans] = useState([]);
  const [records, setRecords] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [teeth, setTeeth] = useState([]);
  const [dentists, setDentists] = useState([]);

  const [showAddPlan, setShowAddPlan] = useState(false);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN_FORM);
  const [planItems, setPlanItems] = useState([]);
  const [newItem, setNewItem] = useState(EMPTY_ITEM_FORM);
  const [savingPlan, setSavingPlan] = useState(false);
  const [error, setError] = useState('');

  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [expandedPlanDetail, setExpandedPlanDetail] = useState(null);
  const [addingItemToPlan, setAddingItemToPlan] = useState(false);

  const [showAddRecord, setShowAddRecord] = useState(false);
  const [recordForm, setRecordForm] = useState(EMPTY_RECORD_FORM);
  const [savingRecord, setSavingRecord] = useState(false);

  function loadPlans() {
    client.get(`/patients/${patientId}/treatment-plans`).then((res) => setPlans(res.data));
  }
  function loadRecords() {
    client.get(`/patients/${patientId}/treatment-records`).then((res) => setRecords(res.data));
  }

  useEffect(() => {
    loadPlans();
    loadRecords();
    client.get('/lookups/treatments').then((res) => setTreatments(res.data));
    client.get('/lookups/dentists').then((res) => setDentists(res.data));
    client.get(`/patients/${patientId}/teeth`).then((res) =>
      setTeeth(res.data.map((t) => ({ id: t.id, tooth_number: t.tooth_number })))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  function addRowToNewPlan() {
    if (!newItem.description) return;
    setPlanItems([...planItems, newItem]);
    setNewItem(EMPTY_ITEM_FORM);
  }

  function removeRowFromNewPlan(idx) {
    setPlanItems(planItems.filter((_, i) => i !== idx));
  }

  async function handleCreatePlan(e) {
    e.preventDefault();
    setError('');
    if (!planForm.title) {
      setError('A plan title is required.');
      return;
    }
    setSavingPlan(true);
    try {
      await client.post(`/patients/${patientId}/treatment-plans`, { ...planForm, items: planItems });
      setShowAddPlan(false);
      setPlanForm(EMPTY_PLAN_FORM);
      setPlanItems([]);
      loadPlans();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create treatment plan.');
    } finally {
      setSavingPlan(false);
    }
  }

  async function togglePlan(planId) {
    if (expandedPlanId === planId) {
      setExpandedPlanId(null);
      setExpandedPlanDetail(null);
      return;
    }
    setExpandedPlanId(planId);
    const res = await client.get(`/treatment-plans/${planId}`);
    setExpandedPlanDetail(res.data);
  }

  async function handlePlanStatusChange(planId, status) {
    await client.patch(`/treatment-plans/${planId}/status`, { status });
    loadPlans();
    if (expandedPlanId === planId) {
      const res = await client.get(`/treatment-plans/${planId}`);
      setExpandedPlanDetail(res.data);
    }
  }

  async function handleItemStatusChange(itemId, status, planId) {
    await client.put(`/treatment-plan-items/${itemId}`, { status });
    const res = await client.get(`/treatment-plans/${planId}`);
    setExpandedPlanDetail(res.data);
    loadPlans();
  }

  async function handleDeleteItem(itemId, planId) {
    await client.delete(`/treatment-plan-items/${itemId}`);
    const res = await client.get(`/treatment-plans/${planId}`);
    setExpandedPlanDetail(res.data);
    loadPlans();
  }

  async function handleAddItemToExistingPlan(e, planId) {
    e.preventDefault();
    if (!newItem.description) return;
    setAddingItemToPlan(true);
    try {
      await client.post(`/treatment-plans/${planId}/items`, newItem);
      setNewItem(EMPTY_ITEM_FORM);
      const res = await client.get(`/treatment-plans/${planId}`);
      setExpandedPlanDetail(res.data);
      loadPlans();
    } finally {
      setAddingItemToPlan(false);
    }
  }

  async function handleCreateRecord(e) {
    e.preventDefault();
    setSavingRecord(true);
    try {
      await client.post(`/patients/${patientId}/treatment-records`, recordForm);
      setShowAddRecord(false);
      setRecordForm(EMPTY_RECORD_FORM);
      loadRecords();
    } finally {
      setSavingRecord(false);
    }
  }

  return (
    <div className="treatment-tab">
      <div className="section-header">
        <h3>Treatment Plans</h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setPlanForm(EMPTY_PLAN_FORM);
            setPlanItems([]);
            setShowAddPlan(true);
          }}
        >
          + New plan
        </button>
      </div>

      <div className="panel">
        {plans.length === 0 && <div className="empty-state">No treatment plans yet.</div>}
        {plans.map((plan) => (
          <div key={plan.id} className="plan-row">
            <div className="plan-row-header" onClick={() => togglePlan(plan.id)}>
              <div>
                <strong>{plan.title}</strong>
                <span className={`badge ${plan.status === 'cancelled' ? 'cancelled' : 'confirmed'}`}>
                  {plan.status.replace('_', ' ')}
                </span>
              </div>
              <div className="plan-row-total">{money(plan.total_estimated)}</div>
            </div>

            {expandedPlanId === plan.id && expandedPlanDetail && (
              <div className="plan-detail">
                {expandedPlanDetail.diagnosis && (
                  <p className="muted">Diagnosis: {expandedPlanDetail.diagnosis}</p>
                )}

                <div className="field" style={{ maxWidth: 220 }}>
                  <label>Plan status</label>
                  <select
                    value={plan.status}
                    onChange={(e) => handlePlanStatusChange(plan.id, e.target.value)}
                  >
                    {PLAN_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Tooth</th>
                      <th>Qty</th>
                      <th>Unit price</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expandedPlanDetail.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>{item.tooth_number || '—'}</td>
                        <td>{item.quantity}</td>
                        <td>{money(item.unit_price)}</td>
                        <td>
                          <select
                            value={item.status}
                            onChange={(e) => handleItemStatusChange(item.id, e.target.value, plan.id)}
                          >
                            {ITEM_STATUSES.map((s) => (
                              <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            className="btn btn-text-danger btn-sm"
                            onClick={() => handleDeleteItem(item.id, plan.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <form className="item-add-row" onSubmit={(e) => handleAddItemToExistingPlan(e, plan.id)}>
                  <input
                    placeholder="Description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                  <select
                    value={newItem.toothId}
                    onChange={(e) => setNewItem({ ...newItem, toothId: e.target.value })}
                  >
                    <option value="">Tooth</option>
                    {teeth.map((t) => (
                      <option key={t.id} value={t.id}>{t.tooth_number}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Qty"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit price"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                  />
                  <button className="btn btn-secondary btn-sm" type="submit" disabled={addingItemToPlan}>
                    Add item
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="section-header" style={{ marginTop: 32 }}>
        <h3>Visit Records</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddRecord(true)}>
          + Add record
        </button>
      </div>

      <div className="panel">
        {records.length === 0 && <div className="empty-state">No treatment records yet.</div>}
        {records.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Tooth</th>
                <th>Diagnosis</th>
                <th>Dentist</th>
                <th>Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>{r.tooth_number || '—'}</td>
                  <td>{r.diagnosis || r.procedure_notes || '—'}</td>
                  <td>{r.dentist_first_name ? `Dr. ${r.dentist_first_name} ${r.dentist_last_name}` : '—'}</td>
                  <td>{r.follow_up_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddPlan && (
        <Modal title="New treatment plan" onClose={() => setShowAddPlan(false)} width={640}>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleCreatePlan}>
            <div className="field">
              <label>Title *</label>
              <input value={planForm.title} onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })} required />
            </div>
            <div className="field">
              <label>Diagnosis</label>
              <input value={planForm.diagnosis} onChange={(e) => setPlanForm({ ...planForm, diagnosis: e.target.value })} />
            </div>
            <div className="field">
              <label>Notes</label>
              <input value={planForm.notes} onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })} />
            </div>

            <h5>Line items</h5>
            {planItems.length > 0 && (
              <table className="mini-table">
                <thead>
                  <tr><th>Description</th><th>Qty</th><th>Unit price</th><th></th></tr>
                </thead>
                <tbody>
                  {planItems.map((it, idx) => (
                    <tr key={idx}>
                      <td>{it.description}</td>
                      <td>{it.quantity}</td>
                      <td>{money(it.unitPrice)}</td>
                      <td>
                        <button type="button" className="btn btn-text-danger btn-sm" onClick={() => removeRowFromNewPlan(idx)}>
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
              <select
                value={newItem.toothId}
                onChange={(e) => setNewItem({ ...newItem, toothId: e.target.value })}
              >
                <option value="">Tooth</option>
                {teeth.map((t) => (
                  <option key={t.id} value={t.id}>{t.tooth_number}</option>
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
              <button type="button" className="btn btn-secondary btn-sm" onClick={addRowToNewPlan}>
                Add row
              </button>
            </div>

            <button className="btn btn-primary" type="submit" disabled={savingPlan} style={{ marginTop: 16 }}>
              {savingPlan ? 'Saving…' : 'Create plan'}
            </button>
          </form>
        </Modal>
      )}

      {showAddRecord && (
        <Modal title="Add treatment record" onClose={() => setShowAddRecord(false)} width={560}>
          <form onSubmit={handleCreateRecord}>
            <div className="form-grid">
              <div className="field">
                <label>Dentist</label>
                <select
                  value={recordForm.dentistId}
                  onChange={(e) => setRecordForm({ ...recordForm, dentistId: e.target.value })}
                >
                  <option value="">Not specified</option>
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Tooth</label>
                <select
                  value={recordForm.toothId}
                  onChange={(e) => setRecordForm({ ...recordForm, toothId: e.target.value })}
                >
                  <option value="">Not specified</option>
                  {teeth.map((t) => (
                    <option key={t.id} value={t.id}>{t.tooth_number}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Treatment</label>
                <select
                  value={recordForm.treatmentId}
                  onChange={(e) => setRecordForm({ ...recordForm, treatmentId: e.target.value })}
                >
                  <option value="">Not specified</option>
                  {treatments.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Follow-up date</label>
                <input
                  type="date"
                  value={recordForm.followUpDate}
                  onChange={(e) => setRecordForm({ ...recordForm, followUpDate: e.target.value })}
                />
              </div>
              <div className="field span-2">
                <label>Diagnosis</label>
                <input
                  value={recordForm.diagnosis}
                  onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                />
              </div>
              <div className="field span-2">
                <label>Procedure notes</label>
                <input
                  value={recordForm.procedureNotes}
                  onChange={(e) => setRecordForm({ ...recordForm, procedureNotes: e.target.value })}
                />
              </div>
              <div className="field span-2">
                <label>Prescription</label>
                <input
                  value={recordForm.prescription}
                  onChange={(e) => setRecordForm({ ...recordForm, prescription: e.target.value })}
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={savingRecord}>
              {savingRecord ? 'Saving…' : 'Save record'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
