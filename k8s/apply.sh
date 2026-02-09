#!/bin/bash

set -e  # Exit on error

echo "Applying Kubernetes Manifests..."

# Check if secrets.yaml exists
if [ ! -f "k8s/secrets.yaml" ]; then
    echo "ERROR: k8s/secrets.yaml not found!"
    echo "Please create it from k8s/secrets.yaml.example and fill in your values:"
    echo "  cp k8s/secrets.yaml.example k8s/secrets.yaml"
    echo "  # Edit k8s/secrets.yaml with your actual secrets"
    exit 1
fi

# 1. Config & Secrets
echo "Applying ConfigMap and Secrets..."
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/nginx-configmap.yaml # New Nginx Config

# 2. Infrastructure (DB, Kafka, Zookeeper)
echo "Applying Infrastructure (PostgreSQL Primary, Replicas, Zookeeper, Kafka)..."
kubectl apply -f k8s/postgres-primary.yaml
kubectl apply -f k8s/postgres-replica.yaml
kubectl apply -f k8s/zookeeper.yaml
kubectl apply -f k8s/zookeeper.yaml
kubectl apply -f k8s/kafka.yaml
kubectl apply -f k8s/kafka-ui.yaml # Kafka UI

echo "Waiting for Infrastructure to be ready..."
# Wait for Zookeeper
echo "Waiting for Zookeeper..."
kubectl wait --for=condition=ready pod -l app=zookeeper --timeout=300s || true

# Wait for Kafka
echo "Waiting for Kafka..."
kubectl wait --for=condition=ready pod -l app=kafka --timeout=300s || true

# Wait for PostgreSQL Primary
echo "Waiting for PostgreSQL Primary..."
kubectl wait --for=condition=ready pod -l app=postgres,role=primary --timeout=300s || true

# Wait a bit for primary to be fully initialized
echo "Waiting 10 seconds for primary database to initialize..."
sleep 10

# Wait for PostgreSQL Replicas
echo "Waiting for PostgreSQL Replicas..."
kubectl wait --for=condition=ready pod -l app=postgres,role=replica --timeout=300s || true

# Give services a moment to stabilize
echo "Infrastructure ready. Waiting 10 seconds for services to stabilize..."
sleep 10

# 3. Services
echo "Applying Application Services..."
kubectl apply -f k8s/auth-service.yaml
kubectl apply -f k8s/core-banking-service.yaml
kubectl apply -f k8s/notification-service.yaml
kubectl apply -f k8s/api-gateway.yaml
kubectl apply -f k8s/nginx.yaml # Nginx Load Balancer

# 4. Frontend
echo "Applying Frontend..."
kubectl apply -f k8s/frontend.yaml

echo ""
echo "✅ Done! All resources applied."
echo ""
echo "Access points:"
echo "  - Frontend: http://localhost:30002"
echo "  - API Gateway (via Nginx): http://localhost:30000"
echo "  - Kafka UI: http://localhost:30080"
echo ""
echo "To check status:"
echo "  kubectl get pods"
echo "  kubectl get services"
