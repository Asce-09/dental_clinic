const express = require('express');
const {
  listUsers, listRoles, createUser, updateUser, updateUserStatus, resetPassword,
} = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', requireRole('admin'), listUsers);
router.post('/', requireRole('admin'), createUser);
router.put('/:id', requireRole('admin'), updateUser);
router.patch('/:id/status', requireRole('admin'), updateUserStatus);
router.post('/:id/reset-password', requireRole('admin'), resetPassword);
router.get('/roles/list', requireRole('admin'), listRoles);

module.exports = router;
