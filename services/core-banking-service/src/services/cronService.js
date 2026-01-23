const cron = require('node-cron');
const db = require('../db');
const TransactionService = require('./transactionService');
const { v4: uuidv4 } = require('uuid');

class CronService {
    start() {
        console.log('Starting Subscription Scheduler...');
        // Run every 10 seconds for demo purposes
        cron.schedule('*/10 * * * * *', async () => {
            console.log('Running subscription check...');
            await this.processSubscriptions();
        });
    }

    async processSubscriptions() {
        try {
            // Find due active subscriptions
            const result = await db.query(
                `SELECT * FROM subscriptions 
                 WHERE is_active = TRUE 
                 AND (next_payment_date IS NULL OR next_payment_date <= NOW())`
            );

            const subscriptions = result.rows;
            console.log(`Found ${subscriptions.length} due subscriptions.`);

            for (const sub of subscriptions) {
                await this.processSubscription(sub);
            }
        } catch (error) {
            console.error('Error in subscription scheduler:', error);
        }
    }

    async processSubscription(sub) {
        console.log(`Processing subscription ${sub.subscription_id} for user ${sub.user_id}`);
        const client = await db.getWriteClient();
        try {
            // 1. Get User's Source Account (Default to first one)
            const accountRes = await client.query(
                'SELECT account_id FROM accounts WHERE user_id = $1 LIMIT 1',
                [sub.user_id]
            );
            if (accountRes.rows.length === 0) {
                console.error(`User ${sub.user_id} has no accounts. Skipping.`);
                return;
            }
            const fromAccountId = accountRes.rows[0].account_id;

            // 2. Get Provider's Target Account
            // We assume provider_id is the username of the merchant/provider
            const providerRes = await client.query(
                `SELECT a.account_id FROM accounts a 
                 JOIN users u ON a.user_id = u.user_id 
                 WHERE u.username = $1 LIMIT 1`,
                [sub.provider_id]
            );

            if (providerRes.rows.length === 0) {
                console.error(`Provider ${sub.provider_id} not found or has no account. Skipping.`);
                return;
            }
            const toAccountId = providerRes.rows[0].account_id;

            // 3. Initiate Transfer
            const transferData = {
                idempotency_key: `sub_${sub.subscription_id}_${Date.now()}`,
                from_account_id: fromAccountId,
                to_account_id: toAccountId,
                amount: parseFloat(sub.amount),
                currency: sub.currency,
                description: `Subscription Payment: ${sub.frequency} to ${sub.provider_id}`
            };

            await TransactionService.transfer(transferData);
            console.log(`Subscription payment successful: ${sub.subscription_id}`);

            // 4. Update Next Payment Date
            await this.updateNextPaymentDate(sub.subscription_id, sub.frequency);

        } catch (error) {
            console.error(`Failed to process subscription ${sub.subscription_id}:`, error.message);
        } finally {
            client.release();
        }
    }

    async updateNextPaymentDate(subscriptionId, frequency) {
        let interval = '1 month';
        if (frequency === 'BI_MONTHLY') interval = '2 months'; // Or 2 weeks? Assuming 2 months based on naming, or twice a month? "Bi-monthly" is ambiguous. Let's assume every 2 months for now as per common billing. Or semimonthly? "Bi monthly" usually means every 2 months.
        // If user meant twice a month (semimonthly), '14 days' or '15 days'. 
        // Given prompt "monthly or bi momthyl", likely means every month or every 2 months. 

        await db.query(
            `UPDATE subscriptions 
             SET next_payment_date = NOW() + $1::INTERVAL 
             WHERE subscription_id = $2`,
            [interval, subscriptionId]
        );
    }
}

module.exports = new CronService();
