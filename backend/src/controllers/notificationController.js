const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/notifications?unreadOnly=true
const listNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly } = req.query;

  const where = ['user_id = ?'];
  const params = [req.user.id];
  if (unreadOnly === 'true') {
    where.push('read_at IS NULL');
  }

  const [rows] = await pool.query(
    `SELECT id, type, title, message, read_at, created_at
     FROM notifications
     WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT 50`,
    params
  );

  const [[{ unreadCount }]] = await pool.query(
    'SELECT COUNT(*) AS unreadCount FROM notifications WHERE user_id = ? AND read_at IS NULL',
    [req.user.id]
  );

  res.json({ data: rows, unreadCount });
});

// PATCH /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await pool.query(
    'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ?',
    [id, req.user.id]
  );
  res.json({ message: 'Notification marked read.' });
});

// PATCH /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await pool.query(
    'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
    [req.user.id]
  );
  res.json({ message: 'All notifications marked read.' });
});

module.exports = { listNotifications, markRead, markAllRead };
