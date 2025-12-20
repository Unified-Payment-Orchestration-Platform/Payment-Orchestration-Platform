const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/transactionController');

router.post('/transfer', TransactionController.transfer);
router.post('/deposit', TransactionController.deposit);
router.post('/withdrawal', TransactionController.withdrawal);
router.get('/:transaction_id', TransactionController.getTransaction);
router.get('/:transaction_id/ledger', TransactionController.getLedger);
router.post('/:transaction_id/reverse', TransactionController.reverse);

module.exports = router;
