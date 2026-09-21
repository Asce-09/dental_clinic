const express = require('express');
const { listInquiries, updateInquiryStatus } = require('../controllers/inquiryController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'receptionist'));

router.get('/', listInquiries);
router.patch('/:id/status', updateInquiryStatus);

module.exports = router;
