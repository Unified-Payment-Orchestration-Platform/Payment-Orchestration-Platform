const express = require('express');
const router = express.Router();
const AccountController = require('../controllers/accountController');

router.post('/', AccountController.createAccount);
router.get('/:account_id', AccountController.getAccount);
router.get('/user/:user_id', AccountController.getUserAccounts);
router.patch('/:account_id/status', AccountController.updateStatus);
router.get('/:account_id/balance-history', AccountController.getBalanceHistory);
router.get('/:account_id/transactions', AccountController.getAccountTransactions);


module.exports = router;
