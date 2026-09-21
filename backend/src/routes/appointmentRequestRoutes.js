const express = require('express');
const { listRequests, updateRequestStatus } = require('../controllers/appointmentRequestController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'receptionist'));

router.get('/', listRequests);
router.patch('/:id/status', updateRequestStatus);

module.exports = router;
