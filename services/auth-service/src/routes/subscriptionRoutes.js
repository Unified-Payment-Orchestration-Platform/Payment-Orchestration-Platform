const express = require('express');
const router = express.Router();
const SubscriptionController = require('../controllers/subscriptionController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Similar to payment methods, mounting at /users
router.get('/:user_id/subscriptions', SubscriptionController.getSubscriptions);
router.post('/:user_id/subscriptions', SubscriptionController.createSubscription);
router.delete('/:user_id/subscriptions/:subscription_id', SubscriptionController.deleteSubscription);

module.exports = router;
