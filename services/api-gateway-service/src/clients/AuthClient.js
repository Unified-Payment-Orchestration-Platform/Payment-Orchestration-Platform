const axios = require('axios');
require('dotenv').config();

class AuthClient {
    constructor() {
        this.baseUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
    }

    async verifyToken(token) {
        try {
            const response = await axios.post(`${this.baseUrl}/auth/validate`, { token });
            return response.data; // { valid: true, user: ... }
        } catch (error) {
            console.error('Auth Service Verify Error:', error.message);
            throw new Error('Auth Token Invalid or Expired');
        }
    }

    // Deprecating complex authorize in favor of simple token check for now
    async authorizePayment(token, paymentDetails) {
        return this.verifyToken(token);
    }
}

module.exports = new AuthClient();
