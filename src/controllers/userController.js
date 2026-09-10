const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('../utils/auditLog');

const listUsers = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.status,
            u.last_login_at, u.created_at, r.id AS role_id, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     ORDER BY u.created_at DESC`
  );
  res.json(rows);
});

const listRoles = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, description FROM roles ORDER BY id');
  res.json(rows);
});

const createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password, roleId } = req.body;

  if (!firstName || !lastName || !email || !password || !roleId) {
    return res.status(400).json({
      message: 'firstName, lastName, email, password and roleId are required.',
    });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [result] = await pool.query(
    `INSERT INTO users (role_id, first_name, last_name, email, phone, password_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [roleId, firstName, lastName, email, phone || null, passwordHash]
  );

  await logAction({
    req, action: 'user.created', entityType: 'user', entityId: result.insertId,
    description: `Created staff account for ${firstName} ${lastName} (${email})`,
  });

  res.status(201).json({ id: result.insertId, message: 'User created.' });
});

// PUT /api/users/:id — edit profile fields (not password)
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, phone, roleId } = req.body;

  if (!firstName || !lastName || !email || !roleId) {
    return res.status(400).json({ message: 'firstName, lastName, email and roleId are required.' });
  }

  await pool.query(
    `UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, role_id = ?
     WHERE id = ?`,
    [firstName, lastName, email, phone || null, roleId, id]
  );

  await logAction({
    req, action: 'user.updated', entityType: 'user', entityId: id,
    description: `Updated profile for user #${id}`,
  });

  res.json({ message: 'User updated.' });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive', 'suspended'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);

  await logAction({
    req, action: 'user.status_changed', entityType: 'user', entityId: id,
    description: `Set user #${id} status to "${status}"`,
  });

  res.json({ message: 'User status updated.' });
});

// POST /api/users/:id/reset-password — admin sets a new password for a staff member
const resetPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);

  await logAction({
    req, action: 'user.password_reset', entityType: 'user', entityId: id,
    description: `Password reset for user #${id} by an admin`,
  });

  res.json({ message: 'Password reset.' });
});

module.exports = {
  listUsers, listRoles, createUser, updateUser, updateUserStatus, resetPassword,
};
