-- Core Banking Service Database Schema
-- This database is used exclusively by the core-banking-service

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fraud Rules Table
CREATE TABLE fraud_rules (
    rule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100),
    threshold DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    version INT DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accounts Table
-- Note: user_id references users in auth-db, but we don't use FK constraint
-- to allow separate databases. Services should validate user existence via API.
CREATE TABLE accounts (
    account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(50), -- References users.user_id in auth-db (no FK constraint)
    account_type VARCHAR(50),
    currency VARCHAR(3),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Account Balances Table
CREATE TABLE account_balances (
    account_id UUID PRIMARY KEY,
    balance DECIMAL(20,6),
    version INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

-- Account Balance Snapshots Table
CREATE TABLE account_balance_snapshots (
    snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID,
    balance DECIMAL(15,2),
    version INT,
    last_updated TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

-- Transactions Table
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    request_hash VARCHAR(255),
    transaction_type VARCHAR(50),
    amount DECIMAL(20,6),
    currency VARCHAR(3),
    fx_rate DECIMAL(10,6),
    fx_provider VARCHAR(50),
    status VARCHAR(50),
    from_account_id UUID,
    to_account_id UUID,
    metadata JSONB,
    parent_transaction_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_account_id) REFERENCES accounts(account_id),
    FOREIGN KEY (to_account_id) REFERENCES accounts(account_id),
    FOREIGN KEY (parent_transaction_id) REFERENCES transactions(transaction_id)
);

-- Transaction Ledger Table
CREATE TABLE transaction_ledger (
    entry_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    posting_group_id UUID,
    transaction_id UUID,
    account_id UUID,
    entry_type VARCHAR(20),
    amount DECIMAL(20,6),
    currency VARCHAR(3),
    balance_after DECIMAL(20,6),
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),
    FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

-- Compliance Logs Table
CREATE TABLE compliance_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID,
    provider VARCHAR(50),
    compliant BOOLEAN,
    risk_score DECIMAL(5,4),
    triggered_rules TEXT[],
    raw_response JSONB,
    account_id UUID,
    check_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by VARCHAR(50),
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),
    FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

-- Authorizations Table
CREATE TABLE authorizations (
    auth_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID,
    auth_code VARCHAR(100),
    processor_response_code VARCHAR(50),
    approved BOOLEAN,
    reason VARCHAR(255),
    latency_ms INT,
    auth_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by VARCHAR(50),
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id)
);

-- Settlements Table
CREATE TABLE settlements (
    settlement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID,
    amount DECIMAL(20,6),
    fee DECIMAL(20,6),
    net_amount DECIMAL(20,6),
    status VARCHAR(50),
    settled_to_account_id UUID,
    settled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),
    FOREIGN KEY (settled_to_account_id) REFERENCES accounts(account_id)
);

-- Reconciliations Table
CREATE TABLE reconciliations (
    recon_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID,
    status VARCHAR(50),
    discrepancy_amount DECIMAL(20,6),
    reconciled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by VARCHAR(50),
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id)
);

-- Notifications Table
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID,
    recipient VARCHAR(150),
    channel VARCHAR(20),
    status VARCHAR(50),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id)
);
