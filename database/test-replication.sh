#!/bin/bash
# Script to test PostgreSQL replication and failover

set -e

echo "=========================================="
echo "PostgreSQL Replication Health Check"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in Docker or Kubernetes
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

# Function to run SQL on primary
run_primary_sql() {
    if [ "$MODE" == "docker" ]; then
        docker exec $PRIMARY_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "$1"
    else
        kubectl exec -it $PRIMARY_POD -- psql -U $DB_USER -d $DB_NAME -t -A -c "$1"
    fi
}

# Function to run SQL on replica
run_replica_sql() {
    if [ "$MODE" == "docker" ]; then
        docker exec $REPLICA_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "$1"
    else
        kubectl exec -it $1 -- psql -U $DB_USER -d $DB_NAME -t -A -c "$1"
    fi
}

# 1. Check Primary Status
echo -e "${YELLOW}1. Checking Primary Database Status...${NC}"
PRIMARY_RECOVERY=$(run_primary_sql "SELECT pg_is_in_recovery();")
if [ "$PRIMARY_RECOVERY" == "f" ]; then
    echo -e "${GREEN}✓ Primary is in read-write mode${NC}"
else
    echo -e "${RED}✗ Primary is in recovery mode (unexpected!)${NC}"
fi
echo ""

# 2. Check Replica Status
echo -e "${YELLOW}2. Checking Replica Database Status...${NC}"
if [ "$MODE" == "docker" ]; then
    REPLICA_RECOVERY=$(run_replica_sql "SELECT pg_is_in_recovery();")
    if [ "$REPLICA_RECOVERY" == "t" ]; then
        echo -e "${GREEN}✓ Replica is in recovery mode (correct)${NC}"
    else
        echo -e "${RED}✗ Replica is NOT in recovery mode (unexpected!)${NC}"
    fi
else
    for REPLICA_POD in $REPLICA_PODS; do
        REPLICA_RECOVERY=$(run_replica_sql "$REPLICA_POD" "SELECT pg_is_in_recovery();")
        if [ "$REPLICA_RECOVERY" == "t" ]; then
            echo -e "${GREEN}✓ Replica $REPLICA_POD is in recovery mode (correct)${NC}"
        else
            echo -e "${RED}✗ Replica $REPLICA_POD is NOT in recovery mode (unexpected!)${NC}"
        fi
    done
fi
echo ""

# 3. Check Replication Slots
echo -e "${YELLOW}3. Checking Replication Slots on Primary...${NC}"
REPLICATION_SLOTS=$(run_primary_sql "SELECT slot_name, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as lag FROM pg_replication_slots;")
if [ -n "$REPLICATION_SLOTS" ]; then
    echo -e "${GREEN}✓ Replication slots found:${NC}"
    echo "$REPLICATION_SLOTS"
else
    echo -e "${YELLOW}⚠ No replication slots found${NC}"
fi
echo ""

# 4. Check Replication Statistics
echo -e "${YELLOW}4. Checking Replication Statistics...${NC}"
REPL_STATS=$(run_primary_sql "SELECT client_addr, state, sync_state, pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) as sent_lag_bytes, pg_wal_lsn_diff(sent_lsn, write_lsn) as write_lag_bytes, pg_wal_lsn_diff(write_lsn, flush_lsn) as flush_lag_bytes, pg_wal_lsn_diff(flush_lsn, replay_lsn) as replay_lag_bytes FROM pg_stat_replication;")
if [ -n "$REPL_STATS" ]; then
    echo -e "${GREEN}✓ Active replication connections:${NC}"
    echo "$REPL_STATS"
else
    echo -e "${RED}✗ No active replication connections${NC}"
fi
echo ""

# 5. Test Write on Primary
echo -e "${YELLOW}5. Testing Write Operation on Primary...${NC}"
TEST_TABLE="replication_test_$(date +%s)"
run_primary_sql "CREATE TABLE IF NOT EXISTS $TEST_TABLE (id SERIAL PRIMARY KEY, test_data TEXT, created_at TIMESTAMP DEFAULT NOW());" > /dev/null
run_primary_sql "INSERT INTO $TEST_TABLE (test_data) VALUES ('test_$(date +%s)');" > /dev/null
ROW_COUNT=$(run_primary_sql "SELECT COUNT(*) FROM $TEST_TABLE;")
if [ "$ROW_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Write successful on primary (inserted $ROW_COUNT row(s))${NC}"
else
    echo -e "${RED}✗ Write failed on primary${NC}"
fi
echo ""

# 6. Test Read from Replica (with delay check)
echo -e "${YELLOW}6. Testing Read from Replica (checking replication lag)...${NC}"
sleep 2  # Wait a bit for replication
if [ "$MODE" == "docker" ]; then
    REPLICA_COUNT=$(run_replica_sql "SELECT COUNT(*) FROM $TEST_TABLE;" 2>/dev/null || echo "0")
    if [ "$REPLICA_COUNT" == "$ROW_COUNT" ]; then
        echo -e "${GREEN}✓ Replica has latest data (read $REPLICA_COUNT row(s), matches primary)${NC}"
    else
        echo -e "${YELLOW}⚠ Replica lag detected (primary: $ROW_COUNT, replica: $REPLICA_COUNT)${NC}"
    fi
else
    for REPLICA_POD in $REPLICA_PODS; do
        REPLICA_COUNT=$(run_replica_sql "$REPLICA_POD" "SELECT COUNT(*) FROM $TEST_TABLE;" 2>/dev/null || echo "0")
        if [ "$REPLICA_COUNT" == "$ROW_COUNT" ]; then
            echo -e "${GREEN}✓ Replica $REPLICA_POD has latest data (read $REPLICA_COUNT row(s))${NC}"
        else
            echo -e "${YELLOW}⚠ Replica $REPLICA_POD lag detected (primary: $ROW_COUNT, replica: $REPLICA_COUNT)${NC}"
        fi
    done
fi
echo ""

# 7. Test Write Attempt on Replica (should fail)
echo -e "${YELLOW}7. Testing Write Attempt on Replica (should fail)...${NC}"
if [ "$MODE" == "docker" ]; then
    WRITE_RESULT=$(run_replica_sql "INSERT INTO $TEST_TABLE (test_data) VALUES ('should_fail');" 2>&1 || echo "FAILED")
    if echo "$WRITE_RESULT" | grep -q "cannot execute\|read-only\|recovery"; then
        echo -e "${GREEN}✓ Replica correctly rejected write operation${NC}"
    else
        echo -e "${RED}✗ Replica allowed write (unexpected!)${NC}"
    fi
else
    for REPLICA_POD in $REPLICA_PODS; do
        WRITE_RESULT=$(run_replica_sql "$REPLICA_POD" "INSERT INTO $TEST_TABLE (test_data) VALUES ('should_fail');" 2>&1 || echo "FAILED")
        if echo "$WRITE_RESULT" | grep -q "cannot execute\|read-only\|recovery"; then
            echo -e "${GREEN}✓ Replica $REPLICA_POD correctly rejected write operation${NC}"
        else
            echo -e "${RED}✗ Replica $REPLICA_POD allowed write (unexpected!)${NC}"
        fi
    done
fi
echo ""

# 8. Check WAL Lag
echo -e "${YELLOW}8. Checking WAL Replication Lag...${NC}"
if [ "$MODE" == "docker" ]; then
    LAG=$(run_primary_sql "SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) as lag_bytes FROM pg_stat_replication LIMIT 1;" 2>/dev/null || echo "N/A")
    if [ "$LAG" != "N/A" ] && [ -n "$LAG" ]; then
        LAG_KB=$((LAG / 1024))
        if [ "$LAG_KB" -lt 1024 ]; then
            echo -e "${GREEN}✓ Replication lag: ${LAG_KB} KB (excellent)${NC}"
        elif [ "$LAG_KB" -lt 10240 ]; then
            echo -e "${YELLOW}⚠ Replication lag: ${LAG_KB} KB (acceptable)${NC}"
        else
            echo -e "${RED}✗ Replication lag: ${LAG_KB} KB (high)${NC}"
        fi
    else
        echo -e "${RED}✗ Could not determine replication lag${NC}"
    fi
else
    LAG=$(run_primary_sql "SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) as lag_bytes FROM pg_stat_replication LIMIT 1;" 2>/dev/null || echo "N/A")
    if [ "$LAG" != "N/A" ] && [ -n "$LAG" ]; then
        LAG_KB=$((LAG / 1024))
        echo -e "${GREEN}✓ Replication lag: ${LAG_KB} KB${NC}"
    else
        echo -e "${RED}✗ Could not determine replication lag${NC}"
    fi
fi
echo ""

# Cleanup
run_primary_sql "DROP TABLE IF EXISTS $TEST_TABLE;" > /dev/null 2>&1

echo "=========================================="
echo -e "${GREEN}Replication Health Check Complete!${NC}"
echo "=========================================="
