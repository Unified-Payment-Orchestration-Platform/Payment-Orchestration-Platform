

-- 1. Users & Configuration
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    risk_profile VARCHAR(20) DEFAULT 'low', -- low, medium, high
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS payment_methods (
    method_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id),
    type VARCHAR(50) NOT NULL,
    details JSONB, 
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id),
    channels TEXT[], -- e.g., ['email', 'sms']  
    event_types TEXT[], -- e.g., ['payment_failed']
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fraud_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) NOT NULL,
    threshold DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Core Transaction Engine
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id),
    idempotency_key VARCHAR(100) UNIQUE, 
    reference_id VARCHAR(100), 
    payment_type VARCHAR(50) NOT NULL,
    amount DECIMAL(20, 6) NOT NULL, 
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'initiated', 
    metadata JSONB, -- Flexible field for future Mongo offload
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);

-- Immutable Ledger for Audit Trails
CREATE TABLE IF NOT EXISTS transaction_ledger (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(50) NOT NULL REFERENCES transactions(transaction_id),
    entry_type VARCHAR(20) NOT NULL, -- DEBIT, CREDIT
    amount DECIMAL(20, 6) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    description VARCHAR(255),
    balance_after DECIMAL(20, 6), -- Snapshot of balance
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Compliance & Risk
CREATE TABLE IF NOT EXISTS compliance_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(50) NOT NULL REFERENCES transactions(transaction_id),
    provider VARCHAR(50),
    compliant BOOLEAN,
    risk_score DECIMAL(5, 4), -- 0.0 to 1.0
    flags TEXT[], -- Array of risk flags
    raw_response JSONB, -- Full payload for audit
    check_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Authorization & Settlement
CREATE TABLE IF NOT EXISTS authorizations (
    auth_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(50) NOT NULL REFERENCES transactions(transaction_id),
    auth_code VARCHAR(100),
    processor_response_code VARCHAR(20),
    approved BOOLEAN NOT NULL,
    reason VARCHAR(255),
    latency_ms INTEGER, -- Performance tracking
    auth_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settlements (
    settlement_id VARCHAR(50) PRIMARY KEY,
    transaction_id VARCHAR(50) NOT NULL REFERENCES transactions(transaction_id),
    amount DECIMAL(20, 6) NOT NULL,
    fee DECIMAL(20, 6) DEFAULT 0.0,
    net_amount DECIMAL(20, 6) GENERATED ALWAYS AS (amount - fee) STORED,
    status VARCHAR(50) NOT NULL, -- success, failed
    settled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Post-Processing
CREATE TABLE IF NOT EXISTS reconciliations (
    recon_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(50) NOT NULL REFERENCES transactions(transaction_id),
    status VARCHAR(50) NOT NULL, -- matched, discrepant
    discrepancy_amount DECIMAL(20, 6) DEFAULT 0.0,
    reconciled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(50) REFERENCES transactions(transaction_id),
    recipient VARCHAR(150),
    channel VARCHAR(20), -- email, sms
    status VARCHAR(50), -- sent, failed
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
