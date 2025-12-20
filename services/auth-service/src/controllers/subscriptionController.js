const SubscriptionService = require('../services/subscriptionService');

class SubscriptionController {
    async getSubscriptions(req, res) {
        try {
            const { user_id } = req.params;
            if (req.user.userId !== user_id && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const subs = await SubscriptionService.getSubscriptions(user_id);
            res.json(subs);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async createSubscription(req, res) {
        try {
            const { user_id } = req.params;
            if (req.user.userId !== user_id && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const sub = await SubscriptionService.createSubscription(user_id, req.body);
            res.status(201).json(sub);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async deleteSubscription(req, res) {
        try {
            const { user_id, subscription_id } = req.params;
            if (req.user.userId !== user_id && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const result = await SubscriptionService.deleteSubscription(user_id, subscription_id);
            if (!result) return res.status(404).json({ error: 'Subscription not found' });
            res.json({ message: 'Subscription deleted' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new SubscriptionController();
