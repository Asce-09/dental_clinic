const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { notify } = require('../utils/notify');

// GET /api/public/clinic-info — safe to expose publicly, it's contact info a clinic wants known
const getClinicInfo = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT clinic_name, address, phone, email FROM clinic_settings ORDER BY id LIMIT 1'
  );
  res.json(rows[0] || null);
});

// GET /api/public/stats — aggregate counts only, never individual patient data
const getStats = asyncHandler(async (req, res) => {
  const [[{ activePatients }]] = await pool.query(
    "SELECT COUNT(*) AS activePatients FROM patients WHERE status = 'active'"
  );
  const [[{ activeDentists }]] = await pool.query(
    `SELECT COUNT(*) AS activeDentists FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'dentist' AND u.status = 'active'`
  );
  const [[{ completedAppointments }]] = await pool.query(
    "SELECT COUNT(*) AS completedAppointments FROM appointments WHERE status = 'completed'"
  );

  res.json({ activePatients, activeDentists, completedAppointments });
});

// POST /api/public/inquiry — from the public site's contact form.
// Doesn't create a patient or appointment record (we don't have enough
// verified info for that yet) — it's saved to website_inquiries for staff
// to work through, and notifies front-desk staff immediately.
const submitInquiry = asyncHandler(async (req, res) => {
  const { name, email, phone, message, website } = req.body;

  // Honeypot: a real visitor never fills this hidden field in; bots often do.
  if (website) {
    return res.status(201).json({ message: 'Thanks! We will get back to you shortly.' });
  }

  if (!name || !message || (!email && !phone)) {
    return res.status(400).json({
      message: 'Please share your name, a way to reach you (email or phone), and your message.',
    });
  }
  if (message.length > 2000) {
    return res.status(400).json({ message: 'Message is too long.' });
  }

  await pool.query(
    `INSERT INTO website_inquiries (name, email, phone, message)
     VALUES (?, ?, ?, ?)`,
    [name, email || null, phone || null, message]
  );

  const [staff] = await pool.query(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
     WHERE r.name IN ('admin', 'receptionist') AND u.status = 'active'`
  );

  const contact = [email, phone].filter(Boolean).join(' · ');
  for (const s of staff) {
    await notify({
      userId: s.id,
      type: 'website_inquiry',
      title: 'New website inquiry',
      message: `${name} (${contact}): ${message.slice(0, 200)}`,
    });
  }

  res.status(201).json({ message: 'Thanks! We will get back to you shortly.' });
});

// GET /api/public/treatments — service menu for the appointment request form
const getTreatments = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, name FROM treatments WHERE status = 'active' ORDER BY name`
  );
  res.json(rows);
});

// POST /api/public/appointment-request — from the landing page's booking form.
// Same idea as submitInquiry: we don't have a verified patient record yet,
// so this saves to appointment_requests (not the real appointments table)
// for staff to confirm and turn into an actual appointment.
const submitAppointmentRequest = asyncHandler(async (req, res) => {
  const { name, email, phone, preferredDate, preferredTime, treatmentId, reason, website } = req.body;

  // Honeypot — same trick as the inquiry form.
  if (website) {
    return res.status(201).json({ message: 'Thanks! We will confirm your appointment shortly.' });
  }

  if (!name || !preferredDate || (!email && !phone)) {
    return res.status(400).json({
      message: 'Please share your name, a way to reach you (email or phone), and your preferred date.',
    });
  }

  const requestedDate = new Date(preferredDate);
  if (Number.isNaN(requestedDate.getTime())) {
    return res.status(400).json({ message: 'Please provide a valid date.' });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (requestedDate < today) {
    return res.status(400).json({ message: 'Preferred date cannot be in the past.' });
  }

  let validTreatmentId = null;
  if (treatmentId) {
    const [[treatment]] = await pool.query(
      "SELECT id FROM treatments WHERE id = ? AND status = 'active'",
      [treatmentId]
    );
    validTreatmentId = treatment ? treatment.id : null;
  }

  const [result] = await pool.query(
    `INSERT INTO appointment_requests
      (name, email, phone, preferred_date, preferred_time, treatment_id, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, email || null, phone || null, preferredDate, preferredTime || null, validTreatmentId, reason || null]
  );

  const [staff] = await pool.query(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
     WHERE r.name IN ('admin', 'receptionist') AND u.status = 'active'`
  );

  const contact = [email, phone].filter(Boolean).join(' · ');
  for (const s of staff) {
    await notify({
      userId: s.id,
      type: 'appointment_requested_public',
      title: 'New appointment request from website',
      message: `${name} (${contact}) requested ${preferredDate}${preferredTime ? ` at ${preferredTime}` : ''}.`,
    });
  }

  res.status(201).json({ id: result.insertId, message: 'Thanks! We will confirm your appointment shortly.' });
});

module.exports = { getClinicInfo, getStats, submitInquiry, getTreatments, submitAppointmentRequest };
