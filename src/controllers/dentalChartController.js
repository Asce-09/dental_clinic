const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/patients/:id/teeth
// Returns all 32 permanent teeth with the patient's current status for each,
// plus any recorded conditions per tooth.
const getChart = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [teeth] = await pool.query(
    `SELECT t.id, t.tooth_number, t.dentition,
            pt.status, pt.notes AS status_notes, pt.updated_at
     FROM teeth t
     LEFT JOIN patient_teeth pt ON pt.tooth_id = t.id AND pt.patient_id = ?
     WHERE t.dentition = 'permanent'
     ORDER BY t.id`,
    [id]
  );

  const [conditions] = await pool.query(
    `SELECT tc.id, tc.tooth_id, tc.condition_name, tc.surface, tc.notes, tc.recorded_at,
            u.first_name AS recorded_by_first_name, u.last_name AS recorded_by_last_name
     FROM tooth_conditions tc
     LEFT JOIN users u ON u.id = tc.recorded_by
     WHERE tc.patient_id = ?
     ORDER BY tc.recorded_at DESC`,
    [id]
  );

  const conditionsByTooth = {};
  conditions.forEach((c) => {
    if (!conditionsByTooth[c.tooth_id]) conditionsByTooth[c.tooth_id] = [];
    conditionsByTooth[c.tooth_id].push(c);
  });

  const chart = teeth.map((t) => ({
    ...t,
    status: t.status || 'healthy',
    conditions: conditionsByTooth[t.id] || [],
  }));

  res.json(chart);
});

// PUT /api/patients/:id/teeth/:toothId
const updateToothStatus = asyncHandler(async (req, res) => {
  const { id, toothId } = req.params;
  const { status, notes } = req.body;

  const validStatuses = [
    'healthy', 'caries', 'filled', 'crowned', 'root_canal',
    'missing', 'extracted', 'implant', 'other',
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid tooth status.' });
  }

  await pool.query(
    `INSERT INTO patient_teeth (patient_id, tooth_id, status, notes, updated_by)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes), updated_by = VALUES(updated_by)`,
    [id, toothId, status, notes || null, req.user.id]
  );

  res.json({ message: 'Tooth status updated.' });
});

// POST /api/patients/:id/teeth/:toothId/conditions
const addToothCondition = asyncHandler(async (req, res) => {
  const { id, toothId } = req.params;
  const { conditionName, surface, notes } = req.body;

  if (!conditionName) {
    return res.status(400).json({ message: 'conditionName is required.' });
  }

  const [result] = await pool.query(
    `INSERT INTO tooth_conditions (patient_id, tooth_id, condition_name, surface, notes, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, toothId, conditionName, surface || 'whole', notes || null, req.user.id]
  );

  res.status(201).json({ id: result.insertId, message: 'Condition recorded.' });
});

module.exports = { getChart, updateToothStatus, addToothCondition };
