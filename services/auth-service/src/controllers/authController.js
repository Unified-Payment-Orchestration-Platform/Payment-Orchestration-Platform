const AuthService = require('../services/authService');

class AuthController {
    async register(req, res) {
        try {
            const { username, email, password } = req.body;
            if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

            const user = await AuthService.register(username, email, password);
            res.status(201).json({ message: 'User registered', user });
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
}

module.exports = new AuthController();
