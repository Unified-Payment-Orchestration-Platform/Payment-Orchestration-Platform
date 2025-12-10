# API Usage Guide

This guide details how to interact with the currently implemented services: **Auth Service** and **API Gateway**.

## prerequisites
-   Services must be running.
    -   Auth Service: `http://localhost:3001`
    -   API Gateway: `http://localhost:3000`
-   Database (`app_db`) must be running via Docker.

---

## 1. Authentication Service (`:3001`)

### Register a User
Create a new user to get valid credentials.

**Endpoint**: `POST /auth/register`

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "johndoe@example.com",
    "password": "SecurePassword123!"
  }'
```

**Response**:
```json
{
  "message": "User registered",
  "user": {
    "user_id": "user-uuid...",
    "username": "johndoe",
    "email": "johndoe@example.com",
    "role": "user"
  }
}
```

### Login
Authenticate to receive an Access Token.

**Endpoint**: `POST /auth/login`

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "johndoe@example.com",
    "password": "SecurePassword123!"
  }'
```

**Response**:
```json
{
  "user": { ... },
  "accessToken": "eyJhbGci...",  <-- SAVE THIS TOKEN
  "refreshToken": "eyJhbGci..."
}
```

### Validate Token (Internal/Debug)
Check if a token is valid.

**Endpoint**: `POST /auth/validate`

```bash
curl -X POST http://localhost:3001/auth/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_ACCESS_TOKEN_HERE"
  }'
```

---

## 2. API Gateway (`:3000`)

### Initiate Payment
Submit a payment request. Requires a valid Access Token from the Auth Service.

**Endpoint**: `POST /v1/payments`

**Headers**:
-   `Authorization`: `Bearer <YOUR_ACCESS_TOKEN>`

```bash
curl -X POST http://localhost:3000/v1/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -d '{
    "paymentType": "card",
    "amount": 100.50,
    "currency": "USD",
    "metadata": {
      "userId": "<USER_ID_FROM_LOGIN>",
      "notes": "Test payment"
    }
  }'
```

**Response**:
```json
{
  "transaction_id": "tx-uuid...",
  "status": "initiated",
  "amount": "100.500000",
  ...
}
```
