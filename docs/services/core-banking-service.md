# Core Banking Service Documentation

## Overview
The **Core Banking Service** functions as the system of record for all financial accounts, transactions, and balances. It enforces double-entry bookkeeping and compliance checks.

## Architecture
- **Tech Stack**: Node.js, Express, PostgreSQL.
- **Port**: 3005 (default).
- **Event Bus**: Kafka (Producers: `transaction-events`, `account-events`).

## API Endpoints

### Accounts
| Method | Endpoint | Description |
|---|---|---|
| POST | `/accounts` | Create a new account |
| GET | `/accounts/:id` | Get account details & balance |
| GET | `/accounts/user/:userId` | List user accounts |

### Transactions
| Method | Endpoint | Description |
|---|---|---|
| POST | `/transactions/transfer` | Internal P2P transfer |
| POST | `/transactions/deposit` | External deposit (Credit) |
| POST | `/transactions/withdrawal` | External withdrawal (Debit) |
| GET | `/transactions/:id` | Get transaction status |
| GET | `/transactions/:id/ledger` | View ledger entries |

### Compliance
| Method | Endpoint | Description |
|---|---|---|
| POST | `/compliance/check` | Pre-transaction risk check |
| GET | `/compliance/logs/:id` | View compliance logs |

### Settlements
| Method | Endpoint | Description |
|---|---|---|
| POST | `/settlements/process` | Trigger batch settlement |

## Kafka Integration
The service publishes the following events:
- **Topic**: `transaction-events`
    - `TransactionCreated`: When a transfer is initiated.
    - `TransactionCompleted`: When funds are successfully moved.
    - `TransactionFailed`: On error/rejection.
- **Topic**: `account-events`
    - `AccountCreated`: When a new account is registered.

## Data Models
- **Account**: `account_id`, `user_id`, `balance`, `currency`.
- **Transaction**: `transaction_id`, `amount`, `status`, `from_account`, `to_account`.
- **Ledger**: `entry_id`, `transaction_id`, `debit/credit`, `amount`, `balance_snapshot`.
