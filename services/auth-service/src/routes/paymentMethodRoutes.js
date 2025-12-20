const express = require('express');
const router = express.Router();
const PaymentMethodController = require('../controllers/paymentMethodController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Determine if we want /users/:user_id/payment-methods structure or just /payment-methods (relying on token)
// Task plan specified /users/{user_id}/payment-methods.
// We will mount this router at /users so the definitions here will start with /:user_id/payment-methods

router.get('/:user_id/payment-methods', PaymentMethodController.listMethods);
router.post('/:user_id/payment-methods', PaymentMethodController.addMethod);
router.get('/:user_id/payment-methods/:method_id', PaymentMethodController.getMethod);
router.put('/:user_id/payment-methods/:method_id/default', PaymentMethodController.setDefault);
router.delete('/:user_id/payment-methods/:method_id', PaymentMethodController.deleteMethod);

module.exports = router;
