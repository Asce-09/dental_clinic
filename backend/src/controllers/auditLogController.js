const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/audit-logs?userId=&entityType=&from=&to=&limit=
const listAuditLogs = asyncHandler(async (req, res) => {
  const { userId, entityType, from, to, limit = 100 } = req.query;

  const where = [];
  const params = [];

  if (userId) { where.push('al.user_id = ?'); params.push(userId); }
  if (entityType) { where.push('al.entity_type = ?'); params.push(entityType); }
  if (from && to) { where.push('DATE(al.created_at) BETWEEN ? AND ?'); params.push(from, to); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT al.id, al.action, al.entity_type, al.entity_id, al.description,
            al.ip_address, al.created_at,
            u.first_name AS user_first_name, u.last_name AS user_last_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${whereSql}
     ORDER BY al.created_at DESC
     LIMIT ?`,
    [...params, Number(limit)]
  );

  res.json(rows);
});

module.exports = { listAuditLogs };
