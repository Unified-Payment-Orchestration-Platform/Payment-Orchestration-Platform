const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');

router.post('/', (req, res) => PaymentController.initiatePayment(req, res));
router.get('/:id', (req, res) => PaymentController.getPaymentStatus(req, res));

module.exports = router;
