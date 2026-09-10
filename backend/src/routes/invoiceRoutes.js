const express = require('express');
const {
  listInvoices, getInvoice, createInvoice, updateInvoiceStatus, recordPayment,
} = require('../controllers/invoiceController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const BILLING_STAFF = ['admin', 'receptionist', 'accountant'];

router.use(requireAuth);

router.get('/', listInvoices);
router.get('/:id', getInvoice);
router.post('/', requireRole(...BILLING_STAFF), createInvoice);
router.patch('/:id/status', requireRole(...BILLING_STAFF), updateInvoiceStatus);
router.post('/:id/payments', requireRole(...BILLING_STAFF), recordPayment);

module.exports = router;
