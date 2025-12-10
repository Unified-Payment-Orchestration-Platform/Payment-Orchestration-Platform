const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');

class AuthService {
    async register(username, email, password) {
        // Check if user exists
        const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            throw new Error('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = `user-${uuidv4()}`;

        const newUser = await db.query(
            'INSERT INTO users (user_id, username, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING user_id, username, email, role',
            [userId, username, email, hashedPassword]
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

        return { user: { id: user.user_id, email: user.email, role: user.role }, accessToken, refreshToken };
    }

    async validateToken(token) {
        // Logic handled in controller/middleware usually, but service can wrap it
        const { verifyAccessToken } = require('../utils/tokenUtils'); // Lazy load purely for structure
        return verifyAccessToken(token);
    }
}

module.exports = new AuthService();
