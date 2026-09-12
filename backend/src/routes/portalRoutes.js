const express = require('express');
const {
  getMyProfile, updateMyProfile, listMyAppointments, requestAppointment,
  listMyTreatmentPlans, listMyTreatmentRecords, getMyDentalChart,
  listMyInvoices, getMyInvoice,
} = require('../controllers/portalController');
const { requireAuth, requirePatient } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requirePatient);

router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);

router.get('/appointments', listMyAppointments);
router.post('/appointments', requestAppointment);

router.get('/treatment-plans', listMyTreatmentPlans);
router.get('/treatment-records', listMyTreatmentRecords);
router.get('/dental-chart', getMyDentalChart);

router.get('/invoices', listMyInvoices);
router.get('/invoices/:id', getMyInvoice);

module.exports = router;
