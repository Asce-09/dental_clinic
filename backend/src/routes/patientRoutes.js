const express = require('express');
const {
  listPatients, getPatient, createPatient, updatePatient,
  updatePatientStatus, upsertMedicalHistory,
  enablePortalAccess, resetPortalPassword, setPortalStatus,
} = require('../controllers/patientController');
const {
  getChart, updateToothStatus, addToothCondition,
} = require('../controllers/dentalChartController');
const {
  listDocuments, uploadDocument, downloadDocument, deleteDocument,
} = require('../controllers/patientDocumentController');
const { patientNestedRouter: treatmentPlansForPatient } = require('./treatmentPlanRoutes');
const treatmentRecordsForPatient = require('./treatmentRecordRoutes');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

const DOCUMENT_STAFF = ['admin', 'dentist', 'assistant', 'receptionist'];

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

router.post(
  '/:id/portal/enable',
  requireRole('admin', 'receptionist'),
  enablePortalAccess
);
router.post(
  '/:id/portal/reset-password',
  requireRole('admin', 'receptionist'),
  resetPortalPassword
);
router.patch(
  '/:id/portal/status',
  requireRole('admin', 'receptionist'),
  setPortalStatus
);

router.get('/:id/documents', requireRole(...DOCUMENT_STAFF), listDocuments);
router.post(
  '/:id/documents',
  requireRole(...DOCUMENT_STAFF),
  upload.single('file'),
  uploadDocument
);
router.get('/:id/documents/:docId/download', requireRole(...DOCUMENT_STAFF), downloadDocument);
router.delete('/:id/documents/:docId', requireRole(...DOCUMENT_STAFF), deleteDocument);

router.use('/:id/treatment-plans', treatmentPlansForPatient);
router.use('/:id/treatment-records', treatmentRecordsForPatient);

module.exports = router;
