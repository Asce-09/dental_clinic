const { pool } = require('../config/db');

/**
 * Fire-and-forget audit log entry. Never throws — a logging failure should
 * never block the actual action it's describing.
 *
 * @param {object} opts
 * @param {object} opts.req - the Express request (used for req.user and IP)
 * @param {string} opts.action - short verb phrase, e.g. "user.status_changed"
 * @param {string} [opts.entityType] - e.g. "user", "invoice", "patient"
 * @param {number|string} [opts.entityId]
 * @param {string} [opts.description] - human-readable detail
 */
async function logAction({ req, action, entityType, entityId, description }) {
  try {
    const userId = req?.user?.id || null;
    const ip = req?.ip || req?.connection?.remoteAddress || null;

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType || null, entityId || null, description || null, ip]
    );
  } catch (err) {
    console.error('[audit log] failed to record entry:', err.message);
  }
}

module.exports = { logAction };
