// Decides which set of teeth a patient's dental chart should show, based on age.
//
//   under 6      -> 'primary'   (baby teeth only, 20 teeth: FDI 51-55, 61-65, 71-75, 81-85)
//   6 to 12      -> 'mixed'     (baby teeth still present while permanent teeth erupt)
//   13 and older -> 'permanent' (32 adult teeth: FDI 11-18, 21-28, 31-38, 41-48)
//
// No birth date on file falls back to the adult chart.

const { pool } = require('../config/db');

const VALID_MODES = ['primary', 'mixed', 'permanent'];

function modeForAge(age) {
  if (age === null || age === undefined) return 'permanent';
  if (age < 6) return 'primary';
  if (age < 13) return 'mixed';
  return 'permanent';
}

function dentitionsForMode(mode) {
  if (mode === 'primary') return ['primary'];
  if (mode === 'mixed') return ['primary', 'permanent'];
  return ['permanent'];
}

// Returns { age, autoMode, mode, dentitions }.
// `override` (optional) lets a clinician force a specific chart, e.g. a child
// who is developmentally ahead/behind the age norms.
async function resolveDentition(patientId, override) {
  const [rows] = await pool.query(
    'SELECT TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) AS age FROM patients WHERE id = ?',
    [patientId]
  );
  const age = rows[0] && rows[0].age !== null ? Number(rows[0].age) : null;
  const autoMode = modeForAge(age);
  const mode = VALID_MODES.includes(override) ? override : autoMode;
  return { age, autoMode, mode, dentitions: dentitionsForMode(mode) };
}

module.exports = { resolveDentition, modeForAge, dentitionsForMode, VALID_MODES };
