const BaseRepository = require('./BaseRepository');

class TransactionRepository extends BaseRepository {
    constructor(db) {
        super(db);
    }

    async create(transaction) {
        const {
            transactionId,
            userId,
            paymentType,
            amount,
            currency,
            idempotencyKey,
            metadata
        } = transaction;

        const query = `
      INSERT INTO transactions (
        transaction_id, user_id, payment_type, amount, currency, idempotency_key, metadata, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'initiated')
      RETURNING *;
    `;

        const values = [transactionId, userId, paymentType, amount, currency, idempotencyKey, metadata];

        try {
            const result = await this.db.query(query, values);
            return result.rows[0];
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                throw new Error('Duplicate Transaction or Idempotency Key');
            }
            throw error;
        }
    }

    async findById(transactionId) {
        const query = 'SELECT * FROM transactions WHERE transaction_id = $1';
        const result = await this.db.query(query, [transactionId]);
        return result.rows[0];
    }

    async updateStatus(transactionId, status) {
        const query = `
      UPDATE transactions 
      SET status = $2, updated_at = CURRENT_TIMESTAMP 
      WHERE transaction_id = $1 
      RETURNING *
    `;
        const result = await this.db.query(query, [transactionId, status]);
        return result.rows[0];
    }
}

module.exports = TransactionRepository;
