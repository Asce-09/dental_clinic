const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('../utils/auditLog');

const VALID_STATUSES = ['new', 'in_progress', 'resolved'];

// GET /api/inquiries?status=
const listInquiries = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const where = [];
  const params = [];
  if (status && VALID_STATUSES.includes(status)) {
    where.push('wi.status = ?');
    params.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT wi.id, wi.name, wi.email, wi.phone, wi.message, wi.status,
            wi.created_at, wi.updated_at,
            u.first_name AS handled_by_first_name, u.last_name AS handled_by_last_name
     FROM website_inquiries wi
     LEFT JOIN users u ON u.id = wi.handled_by
     ${whereSql}
     ORDER BY
       FIELD(wi.status, 'new', 'in_progress', 'resolved'),
       wi.created_at DESC
     LIMIT 300`,
    params
  );

  res.json(rows);
});

// PATCH /api/inquiries/:id/status
const updateInquiryStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  await pool.query(
    'UPDATE website_inquiries SET status = ?, handled_by = ? WHERE id = ?',
    [status, req.user.id, id]
  );

  await logAction({
    req, action: 'inquiry.status_changed', entityType: 'website_inquiry', entityId: id,
    description: `Set inquiry #${id} status to "${status}"`,
  });

  res.json({ message: 'Inquiry status updated.' });
});

module.exports = { listInquiries, updateInquiryStatus };
