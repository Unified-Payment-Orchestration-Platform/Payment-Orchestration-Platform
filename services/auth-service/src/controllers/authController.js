const AuthService = require('../services/authService');

class AuthController {
    async register(req, res) {
        try {
            const { username, email, password, phone_number } = req.body;
            if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

            const user = await AuthService.register(username, email, password, phone_number);
            // Generate tokens for immediate login after registration
            const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');
            const token = generateAccessToken(user);
            const refreshToken = generateRefreshToken(user);

            const { publishEvent } = require('../events/kafka');
            publishEvent('auth-events', {
                type: 'UserRegistered',
                payload: {
                    user_id: user.user_id,
                    email: user.email,
                    username: user.username,
                    phone_number: user.phone_number
                }
            });

            res.status(201).json({
                message: 'User registered',
                user: { user_id: user.user_id, email: user.email, role: user.role, username: user.username, is_active: user.is_active, risk_profile: user.risk_profile },
                token,
                refreshToken
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const result = await AuthService.login(email, password);

            // In production, set refreshToken in HTTP-only cookie
            // res.cookie('refreshToken', result.refreshToken, { httpOnly: true, secure: true });

            res.json(result);
        } catch (error) {
            res.status(401).json({ error: error.message });
        }
    }

    async validate(req, res) {
        try {
            const { token } = req.body;
            const decoded = await AuthService.validateToken(token);
            res.json({ valid: true, user: decoded });
        } catch (err) {
            res.status(401).json({ valid: false, error: err.message });
        }
    }

    async verifyUser(req, res) {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (!token) return res.status(401).json({ error: 'No token provided' });

            const decoded = await AuthService.validateToken(token);
            const requestedUserId = req.params.id;

            // Check ownership or role
            if (decoded.userId !== requestedUserId && decoded.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden' });
            }

            res.json({ status: 'verified', user: decoded });
        } catch (err) {
            res.status(401).json({ error: err.message });
        }
    }

    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

            const result = await AuthService.refreshToken(refreshToken);
            res.json(result);
        } catch (error) {
            res.status(401).json({ error: error.message });
        }
    }

    async logout(req, res) {
        try {
            // content-less response suitable for logout
            await AuthService.logout();
            res.status(200).json({ message: 'Logged out successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AuthController();
