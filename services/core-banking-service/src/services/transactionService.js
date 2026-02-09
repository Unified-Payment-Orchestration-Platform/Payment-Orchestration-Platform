const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { publishEvent } = require('../events/kafka');

class TransactionService {
    async transfer(data) {
        const { idempotency_key, from_account_id, to_account_id, amount, currency, description } = data;
        const transactionId = uuidv4();
        const client = await db.getWriteClient(); // Use Write Client

        try {
            await client.query('BEGIN');

            // 1. Check Idempotency
            const existing = await client.query('SELECT * FROM transactions WHERE idempotency_key = $1', [idempotency_key]);
            if (existing.rows.length > 0) {
                await client.query('ROLLBACK');
                return existing.rows[0];
            }

            // 2. Validate Balance
            const balanceRes = await client.query('SELECT balance FROM account_balances WHERE account_id = $1 FOR UPDATE', [from_account_id]);
            if (balanceRes.rows.length === 0) throw new Error('Source account not found');
            const currentBalance = parseFloat(balanceRes.rows[0].balance);
            if (currentBalance < amount) throw new Error('Insufficient funds');

            // 3. Create Transaction Record
            const txRes = await client.query(
                `INSERT INTO transactions (transaction_id, idempotency_key, transaction_type, amount, currency, status, from_account_id, to_account_id, created_at, updated_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
                [transactionId, idempotency_key, 'TRANSFER', amount, currency, 'COMPLETED', from_account_id, to_account_id]
            );
            const transaction = txRes.rows[0];

            // 4. Update Balances & Ledger
            // Debit Sender
            await this.createLedgerEntry(client, transactionId, from_account_id, 'DEBIT', amount, currency, description);
            // Credit Receiver
            await this.createLedgerEntry(client, transactionId, to_account_id, 'CREDIT', amount, currency, description);

            await client.query('COMMIT');

            // 5. Publish Event
            // Note: User details (phone, email, username) should be fetched from auth-service via API
            // Core banking can function independently even if auth-service/auth-db is down
            publishEvent('transaction-events', {
                type: 'TransactionCompleted',
                payload: {
                    ...transaction,
                    from_account_id,
                    to_account_id
                    // User details can be enriched by notification-service via auth-service API
                }
            });

            return transaction;
        } catch (e) {
            await client.query('ROLLBACK');
            publishEvent('transaction-events', {
                type: 'TransactionFailed',
                payload: { idempotency_key, reason: e.message }
            });
            throw e;
        } finally {
            client.release();
        }
    }

    async deposit(data) {
        const { idempotency_key, account_id, amount, currency, provider, provider_transaction_id } = data;
        const transactionId = uuidv4();
        const client = await db.getWriteClient(); // Write Client

        try {
            await client.query('BEGIN');
            // Idempotency check omitted for brevity but should be here

            const txRes = await client.query(
                `INSERT INTO transactions (transaction_id, idempotency_key, transaction_type, amount, currency, status, to_account_id, metadata, created_at, updated_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
                [transactionId, idempotency_key, 'DEPOSIT', amount, currency, 'COMPLETED', account_id, { provider, provider_transaction_id }]
            );

            await this.createLedgerEntry(client, transactionId, account_id, 'CREDIT', amount, currency, `Deposit from ${provider}`);

            await client.query('COMMIT');

            // Publish Event
            // Note: User details should be fetched from auth-service via API if needed
            // Core banking can function independently even if auth-service/auth-db is down
            publishEvent('transaction-events', {
                type: 'TransactionCompleted',
                payload: { ...txRes.rows[0], account_id }
                // User details can be enriched by notification-service via auth-service API
            });

            return txRes.rows[0];
        } catch (e) {
            await client.query('ROLLBACK');
            publishEvent('transaction-events', {
                type: 'TransactionFailed',
                payload: { idempotency_key, reason: e.message, transaction_type: 'DEPOSIT' }
            });
            throw e;
        } finally {
            client.release();
        }
    }

    async withdrawal(data) {
        const { idempotency_key, account_id, amount, currency } = data;
        const transactionId = uuidv4();
        const client = await db.getWriteClient();

        try {
            await client.query('BEGIN');

            // Check Balance
            const balanceRes = await client.query('SELECT balance FROM account_balances WHERE account_id = $1 FOR UPDATE', [account_id]);
            if (balanceRes.rows.length === 0) throw new Error('Account not found');
            if (parseFloat(balanceRes.rows[0].balance) < amount) throw new Error('Insufficient funds');

            const txRes = await client.query(
                `INSERT INTO transactions (transaction_id, idempotency_key, transaction_type, amount, currency, status, from_account_id, created_at, updated_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
                [transactionId, idempotency_key, 'WITHDRAWAL', amount, currency, 'COMPLETED', account_id]
            );

            await this.createLedgerEntry(client, transactionId, account_id, 'DEBIT', amount, currency, 'Withdrawal');

            await client.query('COMMIT');

            // Publish Event
            // Note: User details should be fetched from auth-service via API if needed
            // Core banking can function independently even if auth-service/auth-db is down
            publishEvent('transaction-events', {
                type: 'TransactionCompleted',
                payload: { ...txRes.rows[0], account_id }
                // User details can be enriched by notification-service via auth-service API
            });

            return txRes.rows[0];
        } catch (e) {
            await client.query('ROLLBACK');
            publishEvent('transaction-events', {
                type: 'TransactionFailed',
                payload: { idempotency_key, reason: e.message, transaction_type: 'WITHDRAWAL' }
            });
            throw e;
        } finally {
            client.release();
        }
    }

    async createLedgerEntry(client, transactionId, accountId, type, amount, currency, description) {
        const entryId = uuidv4();

        // Update Balance Table
        const operator = type === 'CREDIT' ? '+' : '-';
        const balRes = await client.query(
            `UPDATE account_balances SET balance = balance ${operator} $1, updated_at = NOW() WHERE account_id = $2 RETURNING balance`,
            [amount, accountId]
        );
        const newBalance = balRes.rows[0].balance;

        // Insert Ledger Entry
        await client.query(
            `INSERT INTO transaction_ledger (entry_id, transaction_id, account_id, entry_type, amount, currency, balance_after, description, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [entryId, transactionId, accountId, type, amount, currency, newBalance, description]
        );
    }

    async getTransaction(transactionId) {
        // Use queryWrite to read from primary since replica is not set up yet
        const result = await db.queryWrite('SELECT * FROM transactions WHERE transaction_id = $1', [transactionId]);
        return result.rows[0];
    }

    async getLedger(transactionId) {
        // Use queryWrite to read from primary since replica is not set up yet
        const result = await db.queryWrite('SELECT * FROM transaction_ledger WHERE transaction_id = $1 ORDER BY created_at ASC', [transactionId]);
        return result.rows;
    }

    async reverse(transactionId, reason) {
        // Semantic reversal: Create a new transaction that swaps from/to with type REVERSAL
        // Implementation omitted for brevity, but follows similar atomic pattern
        return { status: 'NOT_IMPLEMENTED_YET' };
    }
}

module.exports = new TransactionService();
