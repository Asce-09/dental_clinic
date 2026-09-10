const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('../utils/auditLog');

async function recalcPlanTotal(planId) {
  const [[{ total }]] = await pool.query(
    `SELECT COALESCE(SUM(quantity * unit_price), 0) AS total
     FROM treatment_plan_items WHERE treatment_plan_id = ?`,
    [planId]
  );
  await pool.query('UPDATE treatment_plans SET total_estimated = ? WHERE id = ?', [total, planId]);
  return total;
}

async function getPlanWithItems(planId) {
  const [planRows] = await pool.query(
    `SELECT tp.*, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
            p.patient_code
     FROM treatment_plans tp
     JOIN patients p ON p.id = tp.patient_id
     WHERE tp.id = ?`,
    [planId]
  );
  const plan = planRows[0];

  if (!plan) return null;

  const [items] = await pool.query(
    `SELECT tpi.*, t.name AS treatment_name, th.tooth_number
     FROM treatment_plan_items tpi
     LEFT JOIN treatments t ON t.id = tpi.treatment_id
     LEFT JOIN teeth th ON th.id = tpi.tooth_id
     WHERE tpi.treatment_plan_id = ?
     ORDER BY tpi.id`,
    [planId]
  );

  return { ...plan, items };
}

// GET /api/treatment-plans?status=&patientId=
const listAllPlans = asyncHandler(async (req, res) => {
  const { status, patientId } = req.query;
  const where = [];
  const params = [];

  if (status) {
    where.push('tp.status = ?');
    params.push(status);
  }
  if (patientId) {
    where.push('tp.patient_id = ?');
    params.push(patientId);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT tp.id, tp.title, tp.status, tp.total_estimated, tp.created_at,
            p.id AS patient_id, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
            p.patient_code
     FROM treatment_plans tp
     JOIN patients p ON p.id = tp.patient_id
     ${whereSql}
     ORDER BY tp.created_at DESC
     LIMIT 100`,
    params
  );
  res.json(rows);
});

// GET /api/patients/:id/treatment-plans
const listForPatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT id, title, status, total_estimated, diagnosis, created_at
     FROM treatment_plans WHERE patient_id = ? ORDER BY created_at DESC`,
    [id]
  );
  res.json(rows);
});

// GET /api/treatment-plans/:id
const getPlan = asyncHandler(async (req, res) => {
  const plan = await getPlanWithItems(req.params.id);
  if (!plan) return res.status(404).json({ message: 'Treatment plan not found.' });
  res.json(plan);
});

// POST /api/patients/:id/treatment-plans
// body: { title, diagnosis, notes, items: [{ treatmentId, toothId, description, quantity, unitPrice }] }
const createPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, diagnosis, notes, items = [] } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'A plan title is required.' });
  }

  const [result] = await pool.query(
    `INSERT INTO treatment_plans (patient_id, title, diagnosis, notes, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [id, title, diagnosis || null, notes || null, req.user.id]
  );
  const planId = result.insertId;

  for (const item of items) {
    if (!item.description) continue;
    await pool.query(
      `INSERT INTO treatment_plan_items
        (treatment_plan_id, treatment_id, tooth_id, description, quantity, unit_price)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        planId, item.treatmentId || null, item.toothId || null, item.description,
        item.quantity || 1, item.unitPrice || 0,
      ]
    );
  }

  await recalcPlanTotal(planId);
  res.status(201).json({ id: planId, message: 'Treatment plan created.' });
});

// PATCH /api/treatment-plans/:id/status
const updatePlanStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ['proposed', 'accepted', 'in_progress', 'completed', 'cancelled'];
  if (!valid.includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }
  await pool.query('UPDATE treatment_plans SET status = ? WHERE id = ?', [status, id]);

  await logAction({
    req, action: 'treatment_plan.status_changed', entityType: 'treatment_plan', entityId: id,
    description: `Set treatment plan #${id} status to "${status}"`,
  });

  res.json({ message: 'Plan status updated.' });
});

// POST /api/treatment-plans/:id/items
const addItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { treatmentId, toothId, description, quantity, unitPrice } = req.body;

  if (!description) {
    return res.status(400).json({ message: 'Item description is required.' });
  }

  await pool.query(
    `INSERT INTO treatment_plan_items (treatment_plan_id, treatment_id, tooth_id, description, quantity, unit_price)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, treatmentId || null, toothId || null, description, quantity || 1, unitPrice || 0]
  );

  const total = await recalcPlanTotal(id);
  res.status(201).json({ message: 'Item added.', totalEstimated: total });
});

// PUT /api/treatment-plan-items/:itemId
const updateItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { description, quantity, unitPrice, status, notes } = req.body;

  const [itemRows] = await pool.query(
    'SELECT treatment_plan_id FROM treatment_plan_items WHERE id = ?',
    [itemId]
  );
  const item = itemRows[0];
  if (!item) return res.status(404).json({ message: 'Item not found.' });

  const sets = [];
  const params = [];
  if (description !== undefined) { sets.push('description = ?'); params.push(description); }
  if (quantity !== undefined) { sets.push('quantity = ?'); params.push(quantity); }
  if (unitPrice !== undefined) { sets.push('unit_price = ?'); params.push(unitPrice); }
  if (status !== undefined) { sets.push('status = ?'); params.push(status); }
  if (notes !== undefined) { sets.push('notes = ?'); params.push(notes); }

  if (sets.length) {
    params.push(itemId);
    await pool.query(`UPDATE treatment_plan_items SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  const total = await recalcPlanTotal(item.treatment_plan_id);
  res.json({ message: 'Item updated.', totalEstimated: total });
});

// DELETE /api/treatment-plan-items/:itemId
const deleteItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const [itemRows] = await pool.query(
    'SELECT treatment_plan_id FROM treatment_plan_items WHERE id = ?',
    [itemId]
  );
  const item = itemRows[0];
  if (!item) return res.status(404).json({ message: 'Item not found.' });

  await pool.query('DELETE FROM treatment_plan_items WHERE id = ?', [itemId]);
  const total = await recalcPlanTotal(item.treatment_plan_id);
  res.json({ message: 'Item removed.', totalEstimated: total });
});

module.exports = {
  listAllPlans, listForPatient, getPlan, createPlan, updatePlanStatus, addItem, updateItem, deleteItem,
};
