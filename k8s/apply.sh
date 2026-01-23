#!/bin/bash

echo "Applying Kubernetes Manifests..."

# 1. Config & Secrets
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# 2. Infrastructure (DB, Kafka, Zookeeper)
kubectl apply -f k8s/postgres.yaml
# Initialize DB script configmap

kubectl apply -f k8s/zookeeper.yaml
kubectl apply -f k8s/kafka.yaml

echo "Waiting for Infrastructure..."
# Ideally insert wait logic here (e.g., kubectl wait)

# 3. Services
kubectl apply -f k8s/auth-service.yaml
kubectl apply -f k8s/core-banking-service.yaml
kubectl apply -f k8s/notification-service.yaml
kubectl apply -f k8s/api-gateway.yaml

# 4. Frontend
kubectl apply -f k8s/frontend.yaml

echo "Done! Access the Frontend at http://localhost:30002 and API Gateway at http://localhost:30000"
