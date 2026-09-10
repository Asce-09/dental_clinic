const { pool } = require('../config/db');

/**
 * Creates a notification for a staff user and/or a patient.
 * Never throws — notification failures shouldn't block the action that triggered them.
 */
async function notify({ userId, patientId, type, title, message }) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, patient_id, type, title, message)
       VALUES (?, ?, ?, ?, ?)`,
      [userId || null, patientId || null, type, title, message]
    );
  } catch (err) {
    console.error('[notify] failed to create notification:', err.message);
  }
}

module.exports = { notify };
