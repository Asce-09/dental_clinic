const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const listTreatments = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, name, description, default_price, duration_minutes
     FROM treatments WHERE status = 'active' ORDER BY name`
  );
  res.json(rows);
});

const listDentists = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.first_name, u.last_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'dentist' AND u.status = 'active'
     ORDER BY u.first_name`
  );
  res.json(rows);
});

module.exports = { listTreatments, listDentists };
