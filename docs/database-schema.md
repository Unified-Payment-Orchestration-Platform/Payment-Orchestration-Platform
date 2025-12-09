# Database Schema Documentation

This document details the database schema for the Unified Payment Orchestration Platform (`app_db`). The schema is designed to meet banking industry standards, including double-entry ledgering and high-precision financial calculations.

## Tables Overview

### 1. Users & Configuration

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `users` | Stores user identities and profiles. | `user_id` (PK), `email` (Unique) |
| `payment_methods` | Registered payment methods (cards, wallets). | `method_id` (PK), `user_id` (FK) |
| `subscriptions` | User notification preferences. | `subscription_id` (PK), `user_id` (FK) |
| `fraud_rules` | Dynamic rules for fraud detection. | `rule_id` (PK), `threshold` |

### 2. Core Transaction Engine

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `transactions` | **Central Table**. Records all payment requests. | `transaction_id` (PK), `idempotency_key`, `amount` |
| `transaction_ledger` | **Audit Trail**. Double-entry ledger for all fund movements. | `entry_id` (PK), `transaction_id` (FK), `balance_after` |

### 3. Compliance & Risk

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `compliance_logs` | Logs results of compliance checks. | `log_id` (PK), `transaction_id` (FK), `risk_score` |

### 4. Authorization & Settlement

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `authorizations` | Tracks gateway/processor authorization responses. | `auth_id` (PK), `transaction_id` (FK), `auth_code` |
| `settlements` | Tracks final settlement of funds. | `settlement_id` (PK), `net_amount` |

### 5. Post-Processing

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `reconciliations` | Audit results matching ledger vs. processor. | `recon_id` (PK), `discrepancy_amount` |
| `notifications` | History of alerts sent to users. | `notification_id` (PK), `status` |

## Detailed SQL Definitions

Refer to [database/scripts/schema.sql](../database/scripts/schema.sql) for the exact SQL `CREATE TABLE` definitions.
