const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class SubscriptionService {
    async getSubscriptions(userId) {
        const result = await db.query(
            'SELECT subscription_id, channels, event_types, created_at FROM subscriptions WHERE user_id = $1',
            [userId]
        );
        return result.rows;
    }

    async createSubscription(userId, data) {
        const { channels, event_types } = data;
        const subscriptionId = uuidv4();

        const result = await db.query(
            'INSERT INTO subscriptions (subscription_id, user_id, channels, event_types, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING subscription_id, channels, event_types, created_at',
            [subscriptionId, userId, channels, event_types]
        );
        return result.rows[0];
    }

    async deleteSubscription(userId, subscriptionId) {
        const result = await db.query(
            'DELETE FROM subscriptions WHERE user_id = $1 AND subscription_id = $2 RETURNING subscription_id',
            [userId, subscriptionId]
        );
        return result.rows[0];
    }
}

module.exports = new SubscriptionService();