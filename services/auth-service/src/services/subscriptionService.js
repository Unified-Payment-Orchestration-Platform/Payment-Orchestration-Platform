const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class SubscriptionService {
    async getSubscriptions(userId) {
        const result = await db.query(
            'SELECT subscription_id, channels, event_types, amount, currency, frequency, provider_id, next_payment_date, is_active, created_at FROM subscriptions WHERE user_id = $1',
            [userId]
        );
        return result.rows;
    }

    async createSubscription(userId, data) {
        const { channels, event_types, amount, currency, frequency, provider_id, next_payment_date } = data;
        const subscriptionId = uuidv4();

        const result = await db.queryWrite(
            `INSERT INTO subscriptions 
            (subscription_id, user_id, channels, event_types, amount, currency, frequency, provider_id, next_payment_date, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) 
            RETURNING *`,
            [subscriptionId, userId, channels, event_types, amount, currency, frequency, provider_id, next_payment_date]
        );
        return result.rows[0];
    }

    async deleteSubscription(userId, subscriptionId) {
        const result = await db.queryWrite(
            'DELETE FROM subscriptions WHERE user_id = $1 AND subscription_id = $2 RETURNING subscription_id',
            [userId, subscriptionId]
        );
        return result.rows[0];
    }
}

module.exports = new SubscriptionService();
