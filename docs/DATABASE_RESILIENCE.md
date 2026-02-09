# Database Resilience & Service Isolation

## Overview

With separate databases for each service, the system is designed for **service isolation** and **fault tolerance**. If one database goes down, the other service can continue operating independently.

## Resilience Status

### ✅ **Auth Service** (`auth_db`)
- **Can run independently** if `core_banking_db` is down
- No dependencies on core-banking database
- Handles: user authentication, payment methods, subscriptions

### ✅ **Core Banking Service** (`core_banking_db`)
- **Can run independently** if `auth_db` is down
- Removed direct database queries to `users` table
- Handles: accounts, transactions, settlements, compliance
- **Note**: User enrichment (phone, email, username) is now optional and fetched via API if needed

### ✅ **Notification Service** (Stateless - No Database)
- **Fully independent** - No database dependencies
- Event-driven via Kafka
- Can run even if all databases are down (but won't receive events)
- Handles: SMS, Email, PDF receipt generation

### ✅ **Compliance Service** (Stateless - No Database)
- **Fully independent** - No database dependencies
- Event-driven via Kafka
- Can run even if all databases are down (but won't receive events)
- Handles: Real-time compliance checks, risk scoring, compliance verdicts

## What Happens When a Database is Down?

### Scenario 1: `db-auth-primary` is Down
- ❌ **Auth Service**: Cannot authenticate users, manage profiles, or handle subscriptions
- ✅ **Core Banking Service**: **Still functional** for:
  - Account operations (create, query, update)
  - Transaction processing (transfers, deposits, withdrawals)
  - Balance queries
  - Compliance checks
  - Settlements
- ⚠️ **Limitation**: User enrichment data (phone, email) won't be available in events, but core functionality works

### Scenario 2: `db-core-banking-primary` is Down
- ✅ **Auth Service**: **Fully functional** for:
  - User authentication
  - User profile management
  - Payment methods
  - Subscriptions
- ❌ **Core Banking Service**: Cannot process transactions or manage accounts
- ✅ **System**: Users can still log in, manage profiles, but cannot perform financial operations

## Code Changes Made for Resilience

### 1. Removed Direct User Table Queries
**Before:**
```javascript
// ❌ This would fail if auth-db is down
const userRes = await client.query('SELECT phone_number FROM users WHERE user_id = $1', [user_id]);
```

**After:**
```javascript
// ✅ Core banking works independently
publishEvent('transaction-events', {
    type: 'TransactionCompleted',
    payload: { ...transaction, from_account_id, to_account_id }
    // User details can be enriched by notification-service via auth-service API
});
```

### 2. Made User Enrichment Optional
- Transaction events no longer require user data
- Notification service can enrich events by calling auth-service API
- Core banking operations complete successfully even without user details

### 3. Subscription Processing
- Subscription cron job now gracefully handles missing subscriptions table
- In production, should query auth-service API or subscribe to Kafka events
- Prevents core-banking from crashing if auth-db is unavailable

## Best Practices for Cross-Service Communication

### ✅ **Recommended Approach**
1. **API Calls**: Services communicate via REST APIs
2. **Event-Driven**: Use Kafka for async communication
3. **Graceful Degradation**: Services function with reduced features if dependencies are down

### ❌ **Anti-Patterns** (Now Fixed)
1. ~~Direct database queries across services~~
2. ~~Hard dependencies on other service databases~~
3. ~~Blocking operations that require other services~~

## Production Recommendations

### 1. Implement Service-to-Service API Calls
```javascript
// Example: Fetch user details from auth-service
const userResponse = await fetch(`http://auth-service:3001/users/${user_id}`, {
    headers: { 'Authorization': `Bearer ${internalToken}` }
});
const user = await userResponse.json();
```

### 2. Use Circuit Breakers
- Implement circuit breakers for auth-service API calls
- Fallback to basic functionality if auth-service is unavailable

### 3. Event Enrichment Pattern
- Core banking publishes events with minimal data
- Notification service enriches events by calling auth-service
- If auth-service is down, notifications work with available data

### 4. Health Checks
- Each service should have independent health checks
- API Gateway should route traffic based on service health
- Failed services don't bring down the entire system

## Testing Resilience

### Test Auth DB Down
```bash
# Stop auth database
docker-compose stop db-auth-primary db-auth-replica

# Core banking should still:
# - Accept transaction requests
# - Process transfers
# - Query accounts
# - Handle deposits/withdrawals
```

### Test Core Banking DB Down
```bash
# Stop core banking database
docker-compose stop db-core-banking-primary db-core-banking-replica

# Auth service should still:
# - Authenticate users
# - Manage profiles
# - Handle payment methods
# - Manage subscriptions
```

## Service Database Status

| Service | Database | Status | Resilience |
|---------|----------|--------|------------|
| **Auth Service** | `auth_db` | ✅ Has Database | Can run if core-banking-db is down |
| **Core Banking Service** | `core_banking_db` | ✅ Has Database | Can run if auth-db is down |
| **Notification Service** | None | ✅ Stateless | Always runs (event-driven) |
| **Compliance Service** | None | ✅ Stateless | Always runs (event-driven) |
| **API Gateway** | Uses `auth_db` | ⚠️ Shared | Depends on auth-db for health checks |

## Summary

✅ **Services are now resilient** - Each service can operate independently if the other's database is down.

✅ **No hard dependencies** - Removed direct database queries across service boundaries.

✅ **Graceful degradation** - Services function with reduced features rather than failing completely.

✅ **Stateless services** - Notification and Compliance services have no database dependencies.

⚠️ **Future improvements** - Implement API-based communication and event enrichment for full feature parity.

### Optional: Add Databases for Audit/History

If you want separate databases for notification/compliance services (for audit logs, notification history, etc.), we can add:
- `notification_db` - Store notification delivery history, templates, preferences
- `compliance_db` - Store compliance check history, audit logs, rule configurations

This would make them stateful but provide better audit trails and history tracking.
