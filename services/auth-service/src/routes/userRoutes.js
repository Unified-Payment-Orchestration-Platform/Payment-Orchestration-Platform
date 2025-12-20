const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken); // Protect all user routes

router.get('/me', UserController.getProfile);
router.put('/me', UserController.updateProfile);
router.get('/:user_id', UserController.getUserById);
router.patch('/:user_id/status', UserController.updateStatus);

module.exports = router;
