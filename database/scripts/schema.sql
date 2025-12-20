-- =========================
-- 1. Users & Configuration
-- =========================

CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50),
    is_active BOOLEAN,
    risk_profile VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE fraud_rules (
    rule_id UUID PRIMARY KEY,
    rule_name VARCHAR(100),
    threshold DECIMAL(10,2),
    is_active BOOLEAN,
    version INT,
    updated_at TIMESTAMP
);

CREATE TABLE payment_methods (
    method_id UUID PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id),
    type VARCHAR(50),
    details JSONB,
    is_default BOOLEAN,
    created_at TIMESTAMP
);

CREATE TABLE subscriptions (
    subscription_id UUID PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id),
    channels TEXT[],
    event_types TEXT[],
    created_at TIMESTAMP
);

-- =========================
-- 2. Accounts & Balances
-- =========================

CREATE TABLE accounts (
    account_id UUID PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id),
    account_type VARCHAR(50),
    currency VARCHAR(3),
    status VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE account_balances (
    account_id UUID PRIMARY KEY REFERENCES accounts(account_id),
    balance DECIMAL(20,6),
    version INT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE account_balance_snapshots (
    snapshot_id UUID PRIMARY KEY,
    account_id UUID REFERENCES accounts(account_id),
    balance DECIMAL(15,2),
    version INT,
    last_updated TIMESTAMP
);

-- =========================
-- 3. Transactions (IDEMPOTENT)
-- =========================

CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY,
    idempotency_key VARCHAR(100) NOT NULL,
    request_hash VARCHAR(255),
    transaction_type VARCHAR(50),
    amount DECIMAL(20,6),
    currency VARCHAR(3),
    fx_rate DECIMAL(10,6),
    fx_provider VARCHAR(50),
    status VARCHAR(50),
    from_account_id UUID REFERENCES accounts(account_id),
    to_account_id UUID REFERENCES accounts(account_id),
    metadata JSONB,
    parent_transaction_id UUID REFERENCES transactions(transaction_id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE (idempotency_key)
);

-- =========================
-- 4. Ledger
-- =========================

CREATE TABLE transaction_ledger (
    entry_id UUID PRIMARY KEY,
    posting_group_id UUID,
    transaction_id UUID REFERENCES transactions(transaction_id),
    account_id UUID REFERENCES accounts(account_id),
    entry_type VARCHAR(20),
    amount DECIMAL(20,6),
    currency VARCHAR(3),
    balance_after DECIMAL(20,6),
    description VARCHAR(255),
    created_at TIMESTAMP
);

-- =========================
-- 5. Compliance & Processing
-- =========================

CREATE TABLE compliance_logs (
    log_id UUID PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(transaction_id),
    provider VARCHAR(50),
    compliant BOOLEAN,
    risk_score DECIMAL(5,4),
    triggered_rules TEXT[],
    raw_response JSONB,
    account_id UUID REFERENCES accounts(account_id),
    check_date TIMESTAMP,
    performed_by VARCHAR(50)
);

CREATE TABLE authorizations (
    auth_id UUID PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(transaction_id),
    auth_code VARCHAR(100),
    processor_response_code VARCHAR(50),
    approved BOOLEAN,
    reason VARCHAR(255),
    latency_ms INT,
    auth_date TIMESTAMP,
    performed_by VARCHAR(50)
);

CREATE TABLE settlements (
    settlement_id UUID PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(transaction_id),
    amount DECIMAL(20,6),
    fee DECIMAL(20,6),
    net_amount DECIMAL(20,6),
    status VARCHAR(50),
    settled_to_account_id UUID REFERENCES accounts(account_id),
    settled_at TIMESTAMP
);

CREATE TABLE reconciliations (
    recon_id UUID PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(transaction_id),
    status VARCHAR(50),
    discrepancy_amount DECIMAL(20,6),
    reconciled_at TIMESTAMP,
    performed_by VARCHAR(50)
);

CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(transaction_id),
    recipient VARCHAR(150),
    channel VARCHAR(20),
    status VARCHAR(50),
    sent_at TIMESTAMP
);
