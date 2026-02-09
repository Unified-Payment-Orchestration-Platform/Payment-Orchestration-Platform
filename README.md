# Unified Payment Orchestration Platform (UPOP)

A production-grade, microservices-based payment orchestration platform designed for high availability, fault tolerance, and enterprise-grade security. Built with Node.js, Next.js, PostgreSQL (Replicated), and Apache Kafka.

---

## 🚀 Key Features

*   **Microservices Architecture**: Decoupled services for Auth, Banking, Notifications, and Compliance.
*   **Event-Driven Design**: Asynchronous communication via Apache Kafka for strictly decoupled operations.
*   **ACID Compliance**: Strict double-entry bookkeeping ledgers for all financial transactions.
*   **High Availability**: Database replication (Primary/Replica) and stateless service scaling.
*   **Security First**: JWT-based auth, Role-Based Access Control (RBAC), and encrypted sensitive data.
*   **Disaster Recovery**: Automated failover mechanisms and resilient message consumption.

---

## 🏗️ System Architecture

The system follows a typically layered enterprise architecture:

### 1. Client Layer
*   **Web/Mobile Clients**: Connect securely via HTTPS.
*   **Load Balancer**: **Nginx** acts as the ingress controller, handling SSL termination and routing traffic to the API Gateway.

### 2. API Gateway Layer
*   **Single Entry Point**: All internal microservices are hidden behind the Gateway (Port 3000).
*   **Responsibilities**:
    *   **Authentication**: Validates JWTs via a synchronous call to the Auth Service.
    *   **Rate Limiting**: Protects backend services from varying loads.
    *   **Routing**: Proxies requests to the appropriate downstream service.

### 3. Microservices Layer
*   **Auth Service (Port 3001)**: Manages users, roles, and issue JWT access/refresh tokens.
*   **Core Banking Service (Port 3005)**: The transactional heart. Handles:
    *   Double-Entry Ledger (Debits/Credits).
    *   Atomic Transactions (ACID).
    *   Idempotency (Duplicate Request Prevention).
*   **Notification Service (Port 3006)**: Listens to Kafka events to send Emails (SendGrid/SMTP) and SMS (Twilio).
*   **Compliance Service (Port 3007)**: A background worker that analyzes transactions for fraud/risk asynchronously.

### 4. Data & Messaging Layer
*   **PostgreSQL Cluster**:
    *   **Primary**: Handles all WRITE operations.
    *   **Replicas**: Handle READ operations (Selects) to scale throughput.
    *   **Replication**: Asynchronous WAL streaming ensures data consistency.
*   **Apache Kafka**:
    *   Acts as the central nervous system.
    *   Topics: `transaction-events`, `auth-events`, `account-events`.
    *   Ensures that if the Notification Service goes down, the Core Banking Service continues to process payments without interruption.

---

## 🔄 Usage & Reusability

This platform is designed to be forked and adapted. Here is how you can reuse it for your own projects:

### 1. White-Labeling
*   **Frontend**: The Next.js frontend is built with modular components. Update `theme.js` or Tailwind configs to change the branding.
*   **Email Templates**: Customise the HTML templates in `notification-service/src/templates`.

### 2. Swapping Providers
The system uses the **Adapter Pattern** for external integrations:
*   **SMS**: Currently verified with Twilio. To use MessageBird or AWS SNS, implement the `ISmsProvider` interface in `notification-service`.
*   **Email**: Supports SendGrid and SMTP. easy to swap for AWS SES or Postmark.
*   **Forex**: The `fx_provider` field in the database supports plugging in external exchange rate APIs.

### 3. Extending Functionality
*   **New Services**: Add a new service (e.g., `Crypto-Service`) by creating a new folder in `services/`, adding it to `docker-compose.yml`, and registering a route in the API Gateway.
*   **New Events**: Publish new events to Kafka. Any service can subscribe to them without modifying the publisher.

---

## 🛠️ Installation & Setup

### Prerequisites
*   Docker & Docker Compose
*   Node.js v18+ (for local frontend dev)

### 1. Clone & Configure
```bash
git clone https://github.com/your-repo/payment-platform.git
cd payment-platform
# Copy example env (Ensure you set secure passwords for production!)
cp .env.example .env
```

### 2. Start Infrastructure
```bash
# Starts Postgres (Primary+Replica), Kafka, Zookeeper, and all Microservices
docker-compose up -d --build
```

### 3. Verify Deployment
```bash
# Check if services are healthy
docker-compose ps

# Monitor logs
docker-compose log -f api-gateway-service
```

Access the **API Gateway** at `http://localhost:80` (via Nginx).

---

## 🔌 API Reference

### Authentication
*   `POST /auth/login`: Authenticate and receive `accessToken`.
*   `POST /auth/register`: Create a new user account.

### Banking Operations
*   `POST /core/accounts`: Open a new bank account.
*   `POST /core/transactions/transfer`: Transfer funds (Requires JWT).
    *   *Body*: `{ "amount": 100, "currency": "USD", "to_account_id": "...", "idempotency_key": "uuid" }`

### Notifications
*   `GET /receipts/:transaction_id`: Download a PDF receipt.

---

## 🧪 Testing

### Running Tests
We use Jest for unit and integration testing.
```bash
# Test Core Banking Logic
cd services/core-banking-service
npm test
```

### Manual Verification
1.  **Register**: Create a user via `/auth/register`.
2.  **Login**: Get your JWT.
3.  **Transact**: perform a transfer.
4.  **Verify**: Check `docker-compose logs notification-service` to see the SMS/Email being triggered asynchronously.

---

## 🔐 Security Configuration

*   **Secrets**: All sensitive keys (DB passwords, API keys) are managed via `.env` files and Docker Secrets in production.
*   **Network**: Internal services (DB, Kafka) are in a private Docker network and NOT exposed to the host machine (except for debugging ports).
*   **Input Validation**: All endpoints use strict schema validation (Joi/Zod) to prevent injection attacks.

---
