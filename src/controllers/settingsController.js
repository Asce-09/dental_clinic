const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('../utils/auditLog');

// GET /api/settings — any authenticated user (frontend needs currency/clinic name broadly)
const getSettings = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM clinic_settings ORDER BY id LIMIT 1');
  res.json(rows[0] || null);
});

// PUT /api/settings — admin only
const updateSettings = asyncHandler(async (req, res) => {
  const { clinicName, address, phone, email, timezone, currency } = req.body;

  if (!clinicName) {
    return res.status(400).json({ message: 'Clinic name is required.' });
  }

  const [rows] = await pool.query('SELECT id FROM clinic_settings ORDER BY id LIMIT 1');

  if (rows.length) {
    await pool.query(
      `UPDATE clinic_settings
       SET clinic_name = ?, address = ?, phone = ?, email = ?, timezone = ?, currency = ?
       WHERE id = ?`,
      [clinicName, address || null, phone || null, email || null,
        timezone || 'Asia/Manila', currency || 'PHP', rows[0].id]
    );
  } else {
    await pool.query(
      `INSERT INTO clinic_settings (clinic_name, address, phone, email, timezone, currency)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [clinicName, address || null, phone || null, email || null,
        timezone || 'Asia/Manila', currency || 'PHP']
    );
  }

  await logAction({
    req, action: 'settings.updated', entityType: 'clinic_settings',
    description: 'Updated clinic settings',
  });

  res.json({ message: 'Clinic settings updated.' });
});

module.exports = { getSettings, updateSettings };
