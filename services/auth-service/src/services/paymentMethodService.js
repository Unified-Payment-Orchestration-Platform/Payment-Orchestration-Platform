const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class PaymentMethodService {
    async getMethods(userId) {
        const result = await db.query(
            'SELECT method_id, type, details, is_default, created_at FROM payment_methods WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        return result.rows.map(row => ({
            ...row,
            details: this.maskDetails(row.details)
        }));
    }

    async addMethod(userId, data) {
        const { type, details, is_default } = data;
        const methodId = uuidv4();

        // If this is set as default, unset others
        if (is_default) {
            await db.query('UPDATE payment_methods SET is_default = false WHERE user_id = $1', [userId]);
        }

        const result = await db.query(
            'INSERT INTO payment_methods (method_id, user_id, type, details, is_default, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING method_id, type, details, is_default, created_at',
            [methodId, userId, type, details, is_default || false]
        );

        const newMethod = result.rows[0];
        return { ...newMethod, details: this.maskDetails(newMethod.details) };
    }

    async getMethod(userId, methodId) {
        const result = await db.query(
            'SELECT method_id, type, details, is_default, created_at FROM payment_methods WHERE user_id = $1 AND method_id = $2',
            [userId, methodId]
        );
        if (result.rows.length === 0) return null;
        const method = result.rows[0];
        return { ...method, details: this.maskDetails(method.details) };
    }

    async setDefault(userId, methodId) {
        await db.query('BEGIN');
        try {
            await db.query('UPDATE payment_methods SET is_default = false WHERE user_id = $1', [userId]);
            const result = await db.query(
                'UPDATE payment_methods SET is_default = true WHERE user_id = $1 AND method_id = $2 RETURNING method_id, is_default',
                [userId, methodId]
            );
            await db.query('COMMIT');
            return result.rows[0];
        } catch (e) {
            await db.query('ROLLBACK');
            throw e;
        }
    }

    async deleteMethod(userId, methodId) {
        const result = await db.query(
            'DELETE FROM payment_methods WHERE user_id = $1 AND method_id = $2 RETURNING method_id',
            [userId, methodId]
        );
        return result.rows[0];
    }

    maskDetails(details) {
        if (!details) return {};
        // Simple masking logic. In real world, we only store safe data.
        // Assuming details might have 'number' which we shouldn't really store raw, but for demo:
        const safeDetails = { ...details };
        if (safeDetails.number) {
            safeDetails.last4 = safeDetails.number.slice(-4);
            delete safeDetails.number;
        }
        if (safeDetails.cvv) delete safeDetails.cvv;
        return safeDetails;
    }
}

module.exports = new PaymentMethodService();
