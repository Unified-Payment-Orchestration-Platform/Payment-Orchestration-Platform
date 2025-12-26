const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');

class AuthService {
    async register(username, email, password, phone_number) {
        // Check if user exists
        const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            throw new Error('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = `user-${uuidv4()}`;

        const newUser = await db.query(
            'INSERT INTO users (user_id, username, email, password_hash, phone_number) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, username, email, role, phone_number',
            [userId, username, email, hashedPassword, phone_number]
        );

        return newUser.rows[0];
    }

    async login(email, password) {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !user.password_hash) {
            throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        return { user: { user_id: user.user_id, email: user.email, role: user.role, username: user.username }, token: accessToken, refreshToken };
    }

    async validateToken(token) {
        // Logic handled in controller/middleware usually, but service can wrap it
        const { verifyAccessToken } = require('../utils/tokenUtils'); // Lazy load purely for structure
        return verifyAccessToken(token);
    }

    async refreshToken(token) {
        const { verifyRefreshToken, generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');
        const decoded = verifyRefreshToken(token);

        // Optionally verify user still exists/is active
        const userResult = await db.query('SELECT * FROM users WHERE user_id = $1', [decoded.userId]);
        const user = userResult.rows[0];

        if (!user) throw new Error('User not found');
        if (!user.is_active) throw new Error('User is inactive');

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        return { token: newAccessToken, refreshToken: newRefreshToken, user: { user_id: user.user_id, email: user.email, role: user.role } };
    }

    async logout(token) {
        // Without a stateful store (Redis/DB) for tokens, we can't strictly "revoke" a JWT.
        // We could implement a blacklist here if a 'token_blacklist' table existed.
        // For now, we assume client-side removal.
        return true;
    }
}

module.exports = new AuthService();
