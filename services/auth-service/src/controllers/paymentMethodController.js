const PaymentMethodService = require('../services/paymentMethodService');

class PaymentMethodController {
    async listMethods(req, res) {
        try {
            const { user_id } = req.params;
            if (req.user.userId !== user_id && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const methods = await PaymentMethodService.getMethods(user_id);
            res.json(methods);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async addMethod(req, res) {
        try {
            const { user_id } = req.params;
            if (req.user.userId !== user_id) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const method = await PaymentMethodService.addMethod(user_id, req.body);
            res.status(201).json(method);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async getMethod(req, res) {
        try {
            const { user_id, method_id } = req.params;
            if (req.user.userId !== user_id && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const method = await PaymentMethodService.getMethod(user_id, method_id);
            if (!method) return res.status(404).json({ error: 'Method not found' });
            res.json(method);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async setDefault(req, res) {
        try {
            const { user_id, method_id } = req.params;
            if (req.user.userId !== user_id) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const result = await PaymentMethodService.setDefault(user_id, method_id);
            if (!result) return res.status(404).json({ error: 'Method not found' });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async deleteMethod(req, res) {
        try {
            const { user_id, method_id } = req.params;
            if (req.user.userId !== user_id && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const result = await PaymentMethodService.deleteMethod(user_id, method_id);
            if (!result) return res.status(404).json({ error: 'Method not found' });
            res.json({ message: 'Method deleted' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new PaymentMethodController();
