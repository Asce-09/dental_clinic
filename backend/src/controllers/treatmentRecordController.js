const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/patients/:id/treatment-records
const listForPatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT tr.*, t.name AS treatment_name, th.tooth_number,
            u.first_name AS dentist_first_name, u.last_name AS dentist_last_name
     FROM treatment_records tr
     LEFT JOIN treatments t ON t.id = tr.treatment_id
     LEFT JOIN teeth th ON th.id = tr.tooth_id
     LEFT JOIN users u ON u.id = tr.dentist_id
     WHERE tr.patient_id = ?
     ORDER BY tr.created_at DESC`,
    [id]
  );
  res.json(rows);
});

// POST /api/patients/:id/treatment-records
const createRecord = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    appointmentId, treatmentId, treatmentPlanItemId, dentistId, toothId,
    diagnosis, procedureNotes, prescription, followUpDate,
  } = req.body;

  if (!diagnosis && !procedureNotes) {
    return res.status(400).json({ message: 'Please provide at least a diagnosis or procedure notes.' });
  }

  const [result] = await pool.query(
    `INSERT INTO treatment_records
      (patient_id, appointment_id, treatment_id, treatment_plan_item_id, dentist_id, tooth_id,
       diagnosis, procedure_notes, prescription, follow_up_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, appointmentId || null, treatmentId || null, treatmentPlanItemId || null,
      dentistId || null, toothId || null, diagnosis || null, procedureNotes || null,
      prescription || null, followUpDate || null,
    ]
  );

  // If this record completes a planned treatment item, mark it completed.
  if (treatmentPlanItemId) {
    await pool.query(
      "UPDATE treatment_plan_items SET status = 'completed' WHERE id = ?",
      [treatmentPlanItemId]
    );
  }

  res.status(201).json({ id: result.insertId, message: 'Treatment record saved.' });
});

module.exports = { listForPatient, createRecord };
