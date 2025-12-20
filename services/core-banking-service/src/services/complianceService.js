const db = require('../db');
const { v4: uuidv4 } = require('uuid');

class ComplianceService {
    async checkCompliance(data) {
        const { transaction_payload, user_profile } = data;
        const { amount } = transaction_payload;

        let compliant = true;
        let riskScore = 0.0;
        const triggeredRules = [];

        // Simple Rule: High Amount
        if (amount > 10000) {
            riskScore += 0.5;
            triggeredRules.push('High Value Transaction');
        }

        // Simple Rule: Inactive User
        if (user_profile && user_profile.is_active === false) {
            compliant = false;
            riskScore = 1.0;
            triggeredRules.push('Inactive User');
        }

        // Log the check
        const logId = uuidv4();
        // In a real app, we might save this to compliance_logs table
        // await db.query(...) 

        return { compliant, risk_score: riskScore, triggered_rules: triggeredRules };
    }

    async getLogs(transactionId) {
        // Mock implementation for now as table might need setup or we just return empty
        const result = await db.query('SELECT * FROM compliance_logs WHERE transaction_id = $1', [transactionId]);
        return result.rows;
    }
}

module.exports = new ComplianceService();
