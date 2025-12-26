# Payment Orchestration Platform Demo

This demo showcases the end-to-end flow of the platform, including:
1. **Auth Service**: User Registration and JWT generation.
2. **Core Banking Service**: Account creation, Deposits, and Atomic Transfers (ACID).
3. **Idempotency**: Verifying duplicate requests are handled correctly.
4. **Notification Service**: Asynchronous Kafka events generating PDF receipts.

## Quick Start with Docker Compose

### 1. Start All Services
```bash
docker-compose up --build
```

This will start:
- PostgreSQL (Database)
- Kafka + Zookeeper (Message Broker)
- Auth Service (Port 3001)
- Core Banking Service (Port 3005)
- Notification Service (Port 3006)
- API Gateway (Port 3000)

### 2. Run the Demo Script
Wait for all services to be healthy (check logs), then in a new terminal:

```bash
cd demo
npm install
npm start
```

### 3. Verify Results
- **Console Output**: Watch the colorful logs showing the full flow
- **Notifications**: Check docker logs for notification-service to see SMS simulation
- **PDFs**: Generated receipts are stored in the notification-service container

## What the Demo Shows

### ACID Transactions
The transfer operation uses PostgreSQL transactions to ensure atomicity - funds are only deducted from Account A if they are successfully added to Account B.

### Idempotency
The demo retries the same transfer with the same `idempotency_key` to prove the system prevents duplicate processing.

### Distributed Systems (Kafka)
When a transaction completes, Core Banking publishes an event to Kafka. The Notification Service consumes this asynchronously and generates a PDF receipt.

## Stopping Services
```bash
docker-compose down
```
