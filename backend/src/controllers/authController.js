const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      roleId: user.role_id,
      roleName: user.role_name,
      patientId: user.patient_id || null,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const [rows] = await pool.query(
    `SELECT u.id, u.role_id, u.patient_id, u.first_name, u.last_name, u.email, u.password_hash,
            u.status, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = ?
     LIMIT 1`,
    [email]
  );

  const user = rows[0];
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ message: `Your account is ${user.status}. Contact an admin.` });
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  const token = signToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role_name,
    },
  });
});

const me = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.status,
            u.last_login_at, u.patient_id, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?
     LIMIT 1`,
    [req.user.id]
  );

  const user = rows[0];
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  res.json({
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    lastLoginAt: user.last_login_at,
    role: user.role_name,
  });
});

module.exports = { login, me };
