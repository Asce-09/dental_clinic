const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { notify } = require('../utils/notify');

// GET /api/portal/me
const getMyProfile = asyncHandler(async (req, res) => {
  const patientId = req.user.patientId;

  const [rows] = await pool.query('SELECT * FROM patients WHERE id = ?', [patientId]);
  const patient = rows[0];
  if (!patient) {
    return res.status(404).json({ message: 'Patient record not found.' });
  }

  const [historyRows] = await pool.query(
    'SELECT * FROM medical_histories WHERE patient_id = ? ORDER BY updated_at DESC LIMIT 1',
    [patientId]
  );

  res.json({ ...patient, medicalHistory: historyRows[0] || null });
});

// PUT /api/portal/me — patients may update contact details only, not name/DOB/email
const updateMyProfile = asyncHandler(async (req, res) => {
  const patientId = req.user.patientId;
  const { phone, address, emergencyContactName, emergencyContactPhone, emergencyContactRelationship } = req.body;

  await pool.query(
    `UPDATE patients
     SET phone = ?, address = ?, emergency_contact_name = ?,
         emergency_contact_phone = ?, emergency_contact_relationship = ?
     WHERE id = ?`,
    [
      phone || null, address || null, emergencyContactName || null,
      emergencyContactPhone || null, emergencyContactRelationship || null, patientId,
    ]
  );

  res.json({ message: 'Profile updated.' });
});

// GET /api/portal/appointments
const listMyAppointments = asyncHandler(async (req, res) => {
  const patientId = req.user.patientId;

  const [rows] = await pool.query(
    `SELECT a.id, a.appointment_date, a.start_time, a.end_time, a.status, a.source, a.reason,
            u.first_name AS dentist_first_name, u.last_name AS dentist_last_name,
            t.name AS treatment_name
     FROM appointments a
     LEFT JOIN users u ON u.id = a.dentist_id
     LEFT JOIN treatments t ON t.id = a.treatment_id
     WHERE a.patient_id = ?
     ORDER BY a.appointment_date DESC, a.start_time DESC`,
    [patientId]
  );

  res.json(rows);
});

// POST /api/portal/appointments — a request, not a confirmed booking; staff still triages it
const requestAppointment = asyncHandler(async (req, res) => {
  const patientId = req.user.patientId;
  const { treatmentId, appointmentDate, startTime, reason } = req.body;

  if (!appointmentDate || !startTime) {
    return res.status(400).json({ message: 'A preferred date and time are required.' });
  }

  const [result] = await pool.query(
    `INSERT INTO appointments
      (patient_id, treatment_id, appointment_date, start_time, status, source, reason, created_by)
     VALUES (?, ?, ?, ?, 'pending', 'patient_portal', ?, ?)`,
    [patientId, treatmentId || null, appointmentDate, startTime, reason || null, req.user.id]
  );

  const [receptionists] = await pool.query(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
     WHERE r.name IN ('receptionist', 'admin') AND u.status = 'active'`
  );
  const [[patient]] = await pool.query(
    'SELECT first_name, last_name FROM patients WHERE id = ?',
    [patientId]
  );
  for (const staff of receptionists) {
    await notify({
      userId: staff.id,
      type: 'appointment_requested',
      title: 'New appointment request',
      message: `${patient.first_name} ${patient.last_name} requested ${appointmentDate} at ${startTime}.`,
    });
  }

  res.status(201).json({ id: result.insertId, message: 'Appointment requested. The clinic will confirm shortly.' });
});

// GET /api/portal/treatment-plans — read-only
const listMyTreatmentPlans = asyncHandler(async (req, res) => {
  const patientId = req.user.patientId;

  const [plans] = await pool.query(
    `SELECT id, title, status, total_estimated, diagnosis, notes, created_at
     FROM treatment_plans WHERE patient_id = ? ORDER BY created_at DESC`,
    [patientId]
  );

  for (const plan of plans) {
    const [items] = await pool.query(
      `SELECT tpi.id, tpi.description, tpi.quantity, tpi.unit_price, tpi.status,
              t.name AS treatment_name, th.tooth_number
       FROM treatment_plan_items tpi
       LEFT JOIN treatments t ON t.id = tpi.treatment_id
       LEFT JOIN teeth th ON th.id = tpi.tooth_id
       WHERE tpi.treatment_plan_id = ?
       ORDER BY tpi.id`,
      [plan.id]
    );
    plan.items = items;
  }

  res.json(plans);
});

// GET /api/portal/treatment-records — visit history, read-only
const listMyTreatmentRecords = asyncHandler(async (req, res) => {
  const patientId = req.user.patientId;

  const [rows] = await pool.query(
    `SELECT tr.id, tr.created_at, tr.diagnosis, tr.procedure_notes, tr.prescription, tr.follow_up_date,
            t.name AS treatment_name, th.tooth_number,
            u.first_name AS dentist_first_name, u.last_name AS dentist_last_name
     FROM treatment_records tr
     LEFT JOIN treatments t ON t.id = tr.treatment_id
     LEFT JOIN teeth th ON th.id = tr.tooth_id
     LEFT JOIN users u ON u.id = tr.dentist_id
     WHERE tr.patient_id = ?
     ORDER BY tr.created_at DESC`,
    [patientId]
  );

  res.json(rows);
});

// GET /api/portal/dental-chart — read-only
const getMyDentalChart = asyncHandler(async (req, res) => {
  const patientId = req.user.patientId;

  const [teeth] = await pool.query(
    `SELECT t.id, t.tooth_number, t.dentition, pt.status
     FROM teeth t
     LEFT JOIN patient_teeth pt ON pt.tooth_id = t.id AND pt.patient_id = ?
     WHERE t.dentition = 'permanent'
     ORDER BY t.id`,
    [patientId]
  );

  const [conditions] = await pool.query(
    `SELECT tooth_id, condition_name, surface, notes, recorded_at
     FROM tooth_conditions WHERE patient_id = ? ORDER BY recorded_at DESC`,
    [patientId]
  );

  const conditionsByTooth = {};
  conditions.forEach((c) => {
    if (!conditionsByTooth[c.tooth_id]) conditionsByTooth[c.tooth_id] = [];
    conditionsByTooth[c.tooth_id].push(c);
  });

  res.json(teeth.map((t) => ({
    ...t,
    status: t.status || 'healthy',
    conditions: conditionsByTooth[t.id] || [],
  })));
});

// GET /api/portal/invoices
const listMyInvoices = asyncHandler(async (req, res) => {
  const patientId = req.user.patientId;

  const [rows] = await pool.query(
    `SELECT i.id, i.invoice_number, i.total, i.status, i.due_date, i.created_at,
            COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id AND payment_status = 'verified'), 0) AS amount_paid
     FROM invoices i
     WHERE i.patient_id = ?
     ORDER BY i.created_at DESC`,
    [patientId]
  );

  res.json(rows);
});

// GET /api/portal/invoices/:id — ownership is checked explicitly, not assumed from the route
const getMyInvoice = asyncHandler(async (req, res) => {
  const patientId = req.user.patientId;
  const { id } = req.params;

  const [invoiceRows] = await pool.query('SELECT * FROM invoices WHERE id = ?', [id]);
  const invoice = invoiceRows[0];

  if (!invoice || invoice.patient_id !== patientId) {
    return res.status(404).json({ message: 'Invoice not found.' });
  }

  const [items] = await pool.query(
    `SELECT ii.*, t.name AS treatment_name
     FROM invoice_items ii LEFT JOIN treatments t ON t.id = ii.treatment_id
     WHERE ii.invoice_id = ? ORDER BY ii.id`,
    [id]
  );

  const [payments] = await pool.query(
    `SELECT amount, payment_method, payment_status, paid_at
     FROM payments WHERE invoice_id = ? AND payment_status = 'verified' ORDER BY paid_at DESC`,
    [id]
  );

  const amountPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  res.json({ ...invoice, items, payments, amountPaid, balance: Number(invoice.total) - amountPaid });
});

module.exports = {
  getMyProfile, updateMyProfile, listMyAppointments, requestAppointment,
  listMyTreatmentPlans, listMyTreatmentRecords, getMyDentalChart,
  listMyInvoices, getMyInvoice,
};
