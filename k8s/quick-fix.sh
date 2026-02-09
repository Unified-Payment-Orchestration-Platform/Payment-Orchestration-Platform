#!/bin/bash
# Quick fix script to reduce resource requests so pods can be scheduled

echo "Reducing resource requests to allow pods to be scheduled..."

# Reduce CPU requests in deployments
kubectl patch deployment api-gateway-service -p '{"spec":{"template":{"spec":{"containers":[{"name":"api-gateway-service","resources":{"requests":{"cpu":"50m","memory":"64Mi"}}}]}}}}'
kubectl patch deployment auth-service -p '{"spec":{"template":{"spec":{"containers":[{"name":"auth-service","resources":{"requests":{"cpu":"50m","memory":"64Mi"}}}]}}}}'
kubectl patch deployment core-banking-service -p '{"spec":{"template":{"spec":{"containers":[{"name":"core-banking-service","resources":{"requests":{"cpu":"50m","memory":"64Mi"}}}]}}}}'
kubectl patch deployment notification-service -p '{"spec":{"template":{"spec":{"containers":[{"name":"notification-service","resources":{"requests":{"cpu":"50m","memory":"64Mi"}}}]}}}}'

echo "Waiting for deployments to update..."
sleep 10

echo "Checking pod status..."
kubectl get pods

echo ""
echo "If pods are still pending, you may need to:"
echo "1. Increase minikube resources: minikube stop && minikube start --cpus=4 --memory=4096"
echo "2. Or use Docker Compose: docker-compose up -d"
