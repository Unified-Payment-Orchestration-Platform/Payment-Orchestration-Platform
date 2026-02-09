#!/bin/bash

set -e

echo "=========================================="
echo "Kubernetes Deployment Verification Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check pod status
check_pod() {
    local name=$1
    local status=$(kubectl get pod $name -o jsonpath='{.status.phase}' 2>/dev/null || echo "NotFound")
    local ready=$(kubectl get pod $name -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null || echo "false")
    
    if [ "$status" == "Running" ] && [ "$ready" == "true" ]; then
        echo -e "${GREEN}✓${NC} $name: Running and Ready"
        return 0
    elif [ "$status" == "NotFound" ]; then
        echo -e "${RED}✗${NC} $name: Not Found"
        return 1
    else
        echo -e "${YELLOW}⚠${NC} $name: Status=$status, Ready=$ready"
        return 1
    fi
}

# Function to check service
check_service() {
    local name=$1
    if kubectl get service $name &>/dev/null; then
        local cluster_ip=$(kubectl get service $name -o jsonpath='{.spec.clusterIP}')
        echo -e "${GREEN}✓${NC} Service $name: ClusterIP=$cluster_ip"
        return 0
    else
        echo -e "${RED}✗${NC} Service $name: Not Found"
        return 1
    fi
}

# Function to test endpoint
test_endpoint() {
    local service=$1
    local port=$2
    local path=${3:-/health}
    
    echo -n "  Testing $service:$port$path ... "
    if kubectl run test-$service-$(date +%s) --image=curlimages/curl:latest --rm -i --restart=Never -- \
        curl -s -f -m 5 http://$service:$port$path > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

echo "1. Checking Infrastructure Pods..."
echo "-----------------------------------"
check_pod "postgres-0"
check_pod "zookeeper-$(kubectl get pod -l app=zookeeper -o jsonpath='{.items[0].metadata.name}' | grep -o '[^-]*$')"
check_pod "kafka-0"
echo ""

echo "2. Checking Application Pods..."
echo "-----------------------------------"
for deployment in auth-service core-banking-service notification-service api-gateway-service frontend; do
    pod_name=$(kubectl get pod -l app=$deployment -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$pod_name" ]; then
        check_pod "$pod_name"
    else
        echo -e "${YELLOW}⚠${NC} $deployment: No pods found (may need to be deployed)"
    fi
done
echo ""

echo "3. Checking Services..."
echo "-----------------------------------"
check_service "postgres"
check_service "zookeeper"
check_service "kafka"
check_service "auth-service"
check_service "core-banking-service"
check_service "notification-service"
check_service "api-gateway-service"
check_service "frontend"
echo ""

echo "4. Testing Database Connection..."
echo "-----------------------------------"
echo -n "  Testing PostgreSQL connection ... "
if kubectl run test-postgres-$(date +%s) --image=postgres:16-alpine --rm -i --restart=Never -- \
    psql -h postgres -U postgres_user -d app_db -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC} (Note: This requires DB_PASSWORD in environment)"
fi
echo ""

echo "5. Testing Service Health Endpoints..."
echo "-----------------------------------"
# Note: These will only work if the services are deployed and have /health endpoints
test_endpoint "auth-service" "3001" "/health" || echo "  (Service may not be deployed yet)"
test_endpoint "core-banking-service" "3005" "/health" || echo "  (Service may not be deployed yet)"
test_endpoint "notification-service" "3006" "/health" || echo "  (Service may not be deployed yet)"
test_endpoint "api-gateway-service" "3000" "/health" || echo "  (Service may not be deployed yet)"
echo ""

echo "6. Checking Resource Usage..."
echo "-----------------------------------"
kubectl top nodes 2>/dev/null || echo "  (Metrics server not available)"
kubectl top pods 2>/dev/null || echo "  (Metrics server not available)"
echo ""

echo "7. Summary..."
echo "-----------------------------------"
total_pods=$(kubectl get pods --no-headers 2>/dev/null | wc -l)
running_pods=$(kubectl get pods --no-headers 2>/dev/null | grep Running | wc -l)
echo "  Total Pods: $total_pods"
echo "  Running Pods: $running_pods"
echo ""

echo "=========================================="
echo "Verification Complete!"
echo "=========================================="
echo ""
echo "To check pod logs:"
echo "  kubectl logs <pod-name>"
echo ""
echo "To check pod details:"
echo "  kubectl describe pod <pod-name>"
echo ""
echo "To get all resources:"
echo "  kubectl get all"
