#!/bin/bash
# Script to test database failover scenarios

set -e

echo "=========================================="
echo "PostgreSQL Failover Test"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detect environment
if command -v docker &> /dev/null && docker ps | grep -q db-primary; then
    MODE="docker"
    PRIMARY_CONTAINER="db-primary"
    REPLICA_CONTAINER="db-replica"
    DB_USER="${POSTGRES_USER:-postgres_user}"
    DB_NAME="${POSTGRES_DB:-app_db}"
elif kubectl get pods -l app=postgres,role=primary &> /dev/null; then
    MODE="kubernetes"
    PRIMARY_POD=$(kubectl get pods -l app=postgres,role=primary -o jsonpath='{.items[0].metadata.name}')
    REPLICA_PODS=$(kubectl get pods -l app=postgres,role=replica -o jsonpath='{.items[*].metadata.name}')
    DB_USER="${DB_USER:-postgres_user}"
    DB_NAME="${DB_NAME:-app_db}"
else
    echo -e "${RED}Error: Could not detect Docker or Kubernetes environment${NC}"
    exit 1
fi

echo -e "${YELLOW}Environment: ${MODE}${NC}"
echo ""
echo -e "${YELLOW}WARNING: This test will simulate primary database failure${NC}"
echo -e "${YELLOW}Make sure you understand the implications before proceeding${NC}"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Test cancelled."
    exit 0
fi

# Function to run SQL
run_sql() {
    local container=$1
    local sql=$2
    if [ "$MODE" == "docker" ]; then
        docker exec $container psql -U $DB_USER -d $DB_NAME -t -A -c "$sql"
    else
        kubectl exec -it $container -- psql -U $DB_USER -d $DB_NAME -t -A -c "$sql"
    fi
}

# Function to check connectivity
check_connectivity() {
    local container=$1
    if [ "$MODE" == "docker" ]; then
        docker exec $container pg_isready -U $DB_USER -d $DB_NAME > /dev/null 2>&1
    else
        kubectl exec -it $container -- pg_isready -U $DB_USER -d $DB_NAME > /dev/null 2>&1
    fi
}

# Test 1: Create test data before failover
echo -e "${BLUE}Test 1: Creating test data on primary...${NC}"
TEST_TABLE="failover_test_$(date +%s)"
run_sql $PRIMARY_CONTAINER "CREATE TABLE $TEST_TABLE (id SERIAL PRIMARY KEY, data TEXT, created_at TIMESTAMP DEFAULT NOW());" > /dev/null
for i in {1..5}; do
    run_sql $PRIMARY_CONTAINER "INSERT INTO $TEST_TABLE (data) VALUES ('pre_failover_$i');" > /dev/null
done
echo -e "${GREEN}✓ Created 5 test records${NC}"
echo ""

# Test 2: Verify replica has data
echo -e "${BLUE}Test 2: Verifying replica has replicated data...${NC}"
sleep 2
if [ "$MODE" == "docker" ]; then
    COUNT=$(run_sql $REPLICA_CONTAINER "SELECT COUNT(*) FROM $TEST_TABLE;" 2>/dev/null || echo "0")
    echo -e "${GREEN}✓ Replica has $COUNT records${NC}"
else
    for REPLICA_POD in $REPLICA_PODS; do
        COUNT=$(run_sql "$REPLICA_POD" "SELECT COUNT(*) FROM $TEST_TABLE;" 2>/dev/null || echo "0")
        echo -e "${GREEN}✓ Replica $REPLICA_POD has $COUNT records${NC}"
    done
fi
echo ""

# Test 3: Simulate primary failure
echo -e "${BLUE}Test 3: Simulating primary database failure...${NC}"
if [ "$MODE" == "docker" ]; then
    echo "Stopping primary container..."
    docker stop $PRIMARY_CONTAINER > /dev/null
    echo -e "${YELLOW}⚠ Primary database stopped${NC}"
else
    echo "Scaling down primary pod..."
    kubectl scale statefulset postgres-primary --replicas=0
    echo -e "${YELLOW}⚠ Primary database scaled down${NC}"
fi
echo ""

# Test 4: Check application behavior
echo -e "${BLUE}Test 4: Testing application behavior during failover...${NC}"
echo "Attempting to connect to database..."
sleep 2

# Try to connect via application services
if [ "$MODE" == "docker" ]; then
    # Check if services are still running
    if docker ps | grep -q api-gateway-service; then
        echo -e "${YELLOW}⚠ Application services are still running${NC}"
        echo "They should handle the connection failure gracefully"
    fi
else
    if kubectl get pods -l app=api-gateway-service | grep -q Running; then
        echo -e "${YELLOW}⚠ Application services are still running${NC}"
    fi
fi
echo ""

# Test 5: Verify replica is still accessible
echo -e "${BLUE}Test 5: Verifying replica is still accessible for reads...${NC}"
if [ "$MODE" == "docker" ]; then
    if check_connectivity $REPLICA_CONTAINER; then
        COUNT=$(run_sql $REPLICA_CONTAINER "SELECT COUNT(*) FROM $TEST_TABLE;" 2>/dev/null || echo "0")
        echo -e "${GREEN}✓ Replica is accessible and has $COUNT records${NC}"
    else
        echo -e "${RED}✗ Replica is not accessible${NC}"
    fi
else
    for REPLICA_POD in $REPLICA_PODS; do
        if check_connectivity "$REPLICA_POD"; then
            COUNT=$(run_sql "$REPLICA_POD" "SELECT COUNT(*) FROM $TEST_TABLE;" 2>/dev/null || echo "0")
            echo -e "${GREEN}✓ Replica $REPLICA_POD is accessible and has $COUNT records${NC}"
        else
            echo -e "${RED}✗ Replica $REPLICA_POD is not accessible${NC}"
        fi
    done
fi
echo ""

# Test 6: Restore primary
echo -e "${BLUE}Test 6: Restoring primary database...${NC}"
if [ "$MODE" == "docker" ]; then
    echo "Starting primary container..."
    docker start $PRIMARY_CONTAINER > /dev/null
    sleep 5
    if check_connectivity $PRIMARY_CONTAINER; then
        echo -e "${GREEN}✓ Primary database restored${NC}"
    else
        echo -e "${RED}✗ Primary database failed to restore${NC}"
    fi
else
    echo "Scaling up primary pod..."
    kubectl scale statefulset postgres-primary --replicas=1
    sleep 10
    if kubectl get pods -l app=postgres,role=primary | grep -q Running; then
        echo -e "${GREEN}✓ Primary database restored${NC}"
    else
        echo -e "${RED}✗ Primary database failed to restore${NC}"
    fi
fi
echo ""

# Test 7: Verify replication resumes
echo -e "${BLUE}Test 7: Verifying replication resumes after primary restoration...${NC}"
sleep 5
# Add new data to primary
run_sql $PRIMARY_CONTAINER "INSERT INTO $TEST_TABLE (data) VALUES ('post_restore_1');" > /dev/null
sleep 2
if [ "$MODE" == "docker" ]; then
    COUNT=$(run_sql $REPLICA_CONTAINER "SELECT COUNT(*) FROM $TEST_TABLE;" 2>/dev/null || echo "0")
    if [ "$COUNT" -ge 6 ]; then
        echo -e "${GREEN}✓ Replication resumed (replica has $COUNT records)${NC}"
    else
        echo -e "${YELLOW}⚠ Replication may not have fully resumed (replica has $COUNT records)${NC}"
    fi
else
    for REPLICA_POD in $REPLICA_PODS; do
        COUNT=$(run_sql "$REPLICA_POD" "SELECT COUNT(*) FROM $TEST_TABLE;" 2>/dev/null || echo "0")
        if [ "$COUNT" -ge 6 ]; then
            echo -e "${GREEN}✓ Replica $REPLICA_POD replication resumed ($COUNT records)${NC}"
        else
            echo -e "${YELLOW}⚠ Replica $REPLICA_POD replication may not have fully resumed ($COUNT records)${NC}"
        fi
    done
fi
echo ""

# Cleanup
echo -e "${BLUE}Cleaning up test data...${NC}"
run_sql $PRIMARY_CONTAINER "DROP TABLE IF EXISTS $TEST_TABLE;" > /dev/null 2>&1
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}Failover Test Complete!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}Note: In production, you would need to:${NC}"
echo "1. Set up automatic failover (e.g., using Patroni, Stolon)"
echo "2. Configure connection pooling with automatic failover"
echo "3. Set up monitoring and alerts"
echo "4. Test failover procedures regularly"
