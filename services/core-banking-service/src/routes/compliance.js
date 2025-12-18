const express = require("express");
const router = express.Router();
const db = require("../db");
const { v4: uuidv4 } = require("uuid");

// POST /compliance/check
router.post("/check", async (req, res) => {
  try {
    const { transaction_id, amount, user_id, account_id } = req.body;

    // Simple mock logic: fail if amount > 10000
    const riskScore = amount > 10000 ? 0.9 : 0.1;
    const result = riskScore > 0.8 ? "fail" : "pass";

    // Log to DB
    await db.query(
      `INSERT INTO compliance_logs (transaction_id, account_id, risk_score, result)
         VALUES ($1, $2, $3, $4)`,
      [transaction_id || null, account_id, riskScore, result]
    );

    if (result === "fail") {
      return res
        .status(424)
        .json({ result: "fail", risk_score: riskScore, message: "High risk" });
    }

    res.json({ result: "pass", risk_score: riskScore });
  } catch (err) {
    console.error("Compliance check error:", err);
    res.status(500).json({ error: "Compliance check error" });
  }
});

module.exports = router;
