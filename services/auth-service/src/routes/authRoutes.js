const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/validate', AuthController.validate);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', AuthController.logout);

// Legacy/Mixed support (can be moved or kept)
router.get('/users/:id/verify', AuthController.verifyUser);

module.exports = router;
