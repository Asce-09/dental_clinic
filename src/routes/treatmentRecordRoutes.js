const express = require('express');
const { listForPatient, createRecord } = require('../controllers/treatmentRecordController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(requireAuth);
router.get('/', listForPatient);
router.post('/', requireRole('admin', 'dentist', 'assistant'), createRecord);

module.exports = router;
