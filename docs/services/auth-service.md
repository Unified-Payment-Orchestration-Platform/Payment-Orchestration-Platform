# Authentication Service Documentation

## Overview
The **Authentication Service** is responsible for managing user identities, authentication (JWT), role-based access control (RBAC), and user-centric data such as payment methods and subscriptions.

## Architecture
- **Tech Stack**: Node.js, Express, PostgreSQL.
- **Port**: 3001 (default).
- **Authentication**: JWT (Access Token + Refresh Token).

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|Os | | | |
| POST | `/auth/register` | Register a new user | No |
| POST | `/auth/login` | Login and receive tokens | No |
| POST | `/auth/refresh-token` | Refresh access token | No |
| POST | `/auth/logout` | Logout (Client-side) | Yes |
| POST | `/auth/validate` | Validate a token (Internal) | No |

### User Management
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/users/me` | Get own profile | Yes |
| PUT | `/users/me` | Update own profile | Yes |
| GET | `/users/:id` | Get user by ID (Admin/Self) | Yes |
| PATCH | `/users/:id/status` | Update user status (Admin) | Yes |

### Payment Methods
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/payment-methods` | List payment methods | Yes |
| POST | `/payment-methods` | Add payment method | Yes |
| DELETE | `/payment-methods/:id` | Remove payment method | Yes |

### Subscriptions
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/subscriptions` | List subscriptions | Yes |
| POST | `/subscriptions` | Create subscription | Yes |

## Data Models
- **User**: `user_id`, `email`, `password_hash`, `role`, `is_active`.
- **PaymentMethod**: `method_id`, `user_id`, `type`, `masked_number`.
- **Subscription**: `subscription_id`, `user_id`, `plan_type`.

## Integration Guide
- **Internal Use**: The API Gateway uses `/auth/validate` to verify tokens before forwarding requests to other services.
