#!/bin/bash
# SSH Port Forwarding for Payment Orchestration Platform
# This script sets up port forwarding for all services including frontend

ssh -i ~/.ssh/saad-key.pem \
  -L 3002:localhost:3002 \  # Frontend (Next.js)
  -L 8000:localhost:80 \    # API Gateway (via nginx)
  -L 8080:localhost:8080 \  # Kafka UI
  -L 8025:localhost:8025 \  # MailHog Web UI
  -L 3001:localhost:3001 \  # Auth Service
  -L 3005:localhost:3005 \  # Core Banking Service
  -L 3006:localhost:3006 \  # Notification Service
  -L 5432:localhost:5432 \   # PostgreSQL
  ubuntu@13.220.212.159
