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
// verified info for that yet) — it notifies front-desk staff, who follow up
// directly, same as a phone call would work.
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

module.exports = { getClinicInfo, getStats, submitInquiry };
