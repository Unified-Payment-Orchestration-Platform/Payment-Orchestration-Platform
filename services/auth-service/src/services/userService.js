const db = require('../config/db');

class UserService {
    async getProfile(userId) {
        const result = await db.query('SELECT user_id, username, email, role, risk_profile, is_active, created_at FROM users WHERE user_id = $1', [userId]);
        return result.rows[0];
    }

    async updateProfile(userId, data) {
        const { username, email } = data;
        // Basic validation or dynamic query build recommended, but keeping it simple for now
        const result = await db.query(
            'UPDATE users SET username = COALESCE($1, username), email = COALESCE($2, email), updated_at = NOW() WHERE user_id = $3 RETURNING user_id, username, email, role, risk_profile, is_active, created_at',
            [username, email, userId]
        );
        return result.rows[0];
    }

    async getUserById(userId) {
        const result = await db.query('SELECT user_id, username, email, role, risk_profile, is_active, created_at FROM users WHERE user_id = $1', [userId]);
        return result.rows[0];
    }

    async updateStatus(userId, data) {
        const { is_active, risk_profile, role } = data;
        const result = await db.query(
            'UPDATE users SET is_active = COALESCE($1, is_active), risk_profile = COALESCE($2, risk_profile), role = COALESCE($3, role), updated_at = NOW() WHERE user_id = $4 RETURNING user_id, is_active, risk_profile, role',
            [is_active, risk_profile, role, userId]
        );
        return result.rows[0];
    }
}

module.exports = new UserService();
