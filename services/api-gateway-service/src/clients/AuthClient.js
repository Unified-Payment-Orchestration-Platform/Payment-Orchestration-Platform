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

    async authorizePayment(token, paymentDetails) {
        return this.verifyToken(token);
    }

    // --- User Management ---
    async getUserProfile(token) {
        try {
            const response = await axios.get(`${this.baseUrl}/users/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get profile: ${error.message}`);
        }
    }

    // --- Payment Methods ---
    async getPaymentMethods(token, userId) {
        try {
            const response = await axios.get(`${this.baseUrl}/users/${userId}/payment-methods`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get payment methods: ${error.message}`);
        }
    }

    async addPaymentMethod(token, userId, methodData) {
        try {
            const response = await axios.post(`${this.baseUrl}/users/${userId}/payment-methods`, methodData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to add payment method: ${error.message}`);
        }
    }

    // --- Subscriptions ---
    async getSubscriptions(token, userId) {
        try {
            const response = await axios.get(`${this.baseUrl}/users/${userId}/subscriptions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get subscriptions: ${error.message}`);
        }
    }
}

module.exports = new AuthClient();
