const express = require('express');
const {
  listPatients, getPatient, createPatient, updatePatient,
  updatePatientStatus, upsertMedicalHistory,
} = require('../controllers/patientController');
const {
  getChart, updateToothStatus, addToothCondition,
} = require('../controllers/dentalChartController');
const { patientNestedRouter: treatmentPlansForPatient } = require('./treatmentPlanRoutes');
const treatmentRecordsForPatient = require('./treatmentRecordRoutes');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', listPatients);
router.post('/', requireRole('admin', 'dentist', 'assistant', 'receptionist'), createPatient);
router.get('/:id', getPatient);
router.put('/:id', requireRole('admin', 'dentist', 'assistant', 'receptionist'), updatePatient);
router.patch('/:id/status', requireRole('admin', 'receptionist'), updatePatientStatus);

router.put(
  '/:id/medical-history',
  requireRole('admin', 'dentist', 'assistant'),
  upsertMedicalHistory
);

router.get('/:id/teeth', getChart);
router.put('/:id/teeth/:toothId', requireRole('admin', 'dentist', 'assistant'), updateToothStatus);
router.post(
  '/:id/teeth/:toothId/conditions',
  requireRole('admin', 'dentist', 'assistant'),
  addToothCondition
);

router.use('/:id/treatment-plans', treatmentPlansForPatient);
router.use('/:id/treatment-records', treatmentRecordsForPatient);

module.exports = router;
