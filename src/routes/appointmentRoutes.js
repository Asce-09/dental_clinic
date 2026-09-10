const express = require('express');
const {
  listAppointments, getAppointment, createAppointment,
  updateAppointment, updateAppointmentStatus,
} = require('../controllers/appointmentController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

const SCHEDULING_STAFF = ['admin', 'dentist', 'assistant', 'receptionist'];

router.get('/', listAppointments);
router.get('/:id', getAppointment);
router.post('/', requireRole(...SCHEDULING_STAFF), createAppointment);
router.put('/:id', requireRole(...SCHEDULING_STAFF), updateAppointment);
router.patch('/:id/status', requireRole(...SCHEDULING_STAFF), updateAppointmentStatus);

module.exports = router;
