# Database Replication Testing Guide

This guide explains how to verify that your PostgreSQL replication is working correctly and how to test failover scenarios.

## Quick Health Check

Run the replication health check script:

```bash
# For Docker Compose
./database/test-replication.sh

# For Kubernetes
./database/test-replication.sh
```

This script will:
- ✅ Verify primary is in read-write mode
- ✅ Verify replicas are in recovery (read-only) mode
- ✅ Check replication slots and connections
- ✅ Test write operations on primary
- ✅ Test read operations on replicas
- ✅ Verify replicas reject write attempts
- ✅ Check replication lag

## Manual Verification Commands

### 1. Check Primary Status

**Docker:**
```bash
docker exec db-primary psql -U postgres_user -d app_db -c "SELECT pg_is_in_recovery();"
# Should return: f (false = not in recovery = primary)
```

**Kubernetes:**
```bash
kubectl exec -it postgres-primary-0 -- psql -U postgres_user -d app_db -c "SELECT pg_is_in_recovery();"
```

### 2. Check Replica Status

**Docker:**
```bash
docker exec db-replica psql -U postgres_user -d app_db -c "SELECT pg_is_in_recovery();"
# Should return: t (true = in recovery = replica)
```

**Kubernetes:**
```bash
kubectl exec -it postgres-replica-0 -- psql -U postgres_user -d app_db -c "SELECT pg_is_in_recovery();"
```

### 3. Check Replication Connections

**Docker:**
```bash
docker exec db-primary psql -U postgres_user -d app_db -c "SELECT client_addr, state, sync_state, pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) as lag_bytes FROM pg_stat_replication;"
```

**Kubernetes:**
```bash
kubectl exec -it postgres-primary-0 -- psql -U postgres_user -d app_db -c "SELECT client_addr, state, sync_state, pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) as lag_bytes FROM pg_stat_replication;"
```

### 4. Test Write on Primary

**Docker:**
```bash
docker exec db-primary psql -U postgres_user -d app_db -c "CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, data TEXT); INSERT INTO test_table (data) VALUES ('test'); SELECT * FROM test_table;"
```

**Kubernetes:**
```bash
kubectl exec -it postgres-primary-0 -- psql -U postgres_user -d app_db -c "CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, data TEXT); INSERT INTO test_table (data) VALUES ('test'); SELECT * FROM test_table;"
```

### 5. Test Read from Replica

**Docker:**
```bash
# Wait a moment for replication
sleep 2
docker exec db-replica psql -U postgres_user -d app_db -c "SELECT * FROM test_table;"
```

**Kubernetes:**
```bash
sleep 2
kubectl exec -it postgres-replica-0 -- psql -U postgres_user -d app_db -c "SELECT * FROM test_table;"
```

### 6. Verify Replica Rejects Writes

**Docker:**
```bash
docker exec db-replica psql -U postgres_user -d app_db -c "INSERT INTO test_table (data) VALUES ('should_fail');"
# Should fail with: ERROR: cannot execute INSERT in a read-only transaction
```

**Kubernetes:**
```bash
kubectl exec -it postgres-replica-0 -- psql -U postgres_user -d app_db -c "INSERT INTO test_table (data) VALUES ('should_fail');"
# Should fail
```

## Testing Application Read/Write Separation

### Test 1: Verify Reads Go to Replica

Add logging to your application to see which database it connects to, or use connection monitoring:

```bash
# Monitor connections on replica
docker exec db-replica psql -U postgres_user -d app_db -c "SELECT datname, usename, application_name, client_addr, state FROM pg_stat_activity WHERE datname = 'app_db';"
```

Then run a read operation from your application (e.g., GET user profile) and check if the connection appears on the replica.

### Test 2: Verify Writes Go to Primary

```bash
# Monitor connections on primary
docker exec db-primary psql -U postgres_user -d app_db -c "SELECT datname, usename, application_name, client_addr, state FROM pg_stat_activity WHERE datname = 'app_db';"
```

Run a write operation (e.g., create user, update account) and verify the connection appears on primary.

## Failover Testing

### Automated Failover Test

Run the failover test script:

```bash
./database/test-failover.sh
```

**⚠️ WARNING:** This script will:
- Stop the primary database
- Test application behavior during failure
- Restore the primary
- Verify replication resumes

### Manual Failover Test

#### Step 1: Create Test Data
```bash
docker exec db-primary psql -U postgres_user -d app_db -c "CREATE TABLE failover_test (id SERIAL, data TEXT); INSERT INTO failover_test (data) VALUES ('before_failover');"
```

#### Step 2: Verify Replica Has Data
```bash
sleep 2
docker exec db-replica psql -U postgres_user -d app_db -c "SELECT * FROM failover_test;"
```

#### Step 3: Stop Primary
```bash
docker stop db-primary
```

#### Step 4: Test Application Behavior
```bash
# Try to make a request - should handle gracefully
curl http://localhost/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test"}'
```

#### Step 5: Verify Replica Still Works for Reads
```bash
docker exec db-replica psql -U postgres_user -d app_db -c "SELECT * FROM failover_test;"
```

#### Step 6: Restore Primary
```bash
docker start db-primary
sleep 5
docker exec db-primary psql -U postgres_user -d app_db -c "INSERT INTO failover_test (data) VALUES ('after_restore');"
```

#### Step 7: Verify Replication Resumes
```bash
sleep 2
docker exec db-replica psql -U postgres_user -d app_db -c "SELECT * FROM failover_test;"
```

## Monitoring Replication Lag

### Check Current Lag

```bash
docker exec db-primary psql -U postgres_user -d app_db -c "
SELECT 
    client_addr,
    state,
    sync_state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) as sent_lag_bytes,
    pg_wal_lsn_diff(sent_lsn, write_lsn) as write_lag_bytes,
    pg_wal_lsn_diff(write_lsn, flush_lsn) as flush_lag_bytes,
    pg_wal_lsn_diff(flush_lsn, replay_lsn) as replay_lag_bytes,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) as total_lag_bytes
FROM pg_stat_replication;"
```

### Continuous Monitoring

```bash
watch -n 2 'docker exec db-primary psql -U postgres_user -d app_db -c "SELECT client_addr, pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) as lag_bytes FROM pg_stat_replication;"'
```

## Application-Level Testing

### Test Read/Write Separation in Code

Create a test script to verify your application uses the correct database:

```javascript
// test-db-routing.js
const db = require('./services/auth-service/src/config/db');

async function test() {
    // This should go to replica
    console.log('Testing read...');
    const readResult = await db.query('SELECT COUNT(*) FROM users');
    console.log('Read result:', readResult.rows[0]);
    
    // This should go to primary
    console.log('Testing write...');
    const writeResult = await db.queryWrite('INSERT INTO users (user_id, email) VALUES ($1, $2) RETURNING user_id', 
        [`test-${Date.now()}`, 'test@test.com']);
    console.log('Write result:', writeResult.rows[0]);
}

test().catch(console.error);
```

### Monitor Connection Pools

Check which pool is being used:

```javascript
// Add to your db.js
console.log('Write pool connections:', writePool.totalCount);
console.log('Read pool connections:', readPool.totalCount);
```

## Production Considerations

### What to Monitor

1. **Replication Lag**: Should be < 1 second typically
2. **Replication Status**: Should show "streaming" state
3. **Connection Counts**: Monitor connections to primary vs replicas
4. **Error Rates**: Track connection failures and retries

### Alerting

Set up alerts for:
- Replication lag > 10 seconds
- Replication connection down
- Primary database down
- Replica not in recovery mode

### Failover Procedures

For production, consider:
1. **Automatic Failover**: Use Patroni, Stolon, or similar
2. **Connection Pooling**: PgBouncer with automatic failover
3. **Load Balancing**: HAProxy or similar for read replicas
4. **Monitoring**: Prometheus + Grafana for metrics

## Troubleshooting

### Replica Not Connecting

1. Check network connectivity:
   ```bash
   docker exec db-replica ping db-primary
   ```

2. Verify replication user exists:
   ```bash
   docker exec db-primary psql -U postgres_user -d app_db -c "\du"
   ```

3. Check PostgreSQL logs:
   ```bash
   docker logs db-replica
   docker logs db-primary
   ```

### High Replication Lag

1. Check network bandwidth
2. Verify primary has sufficient resources
3. Check for long-running transactions on primary
4. Consider increasing `max_wal_senders` if needed

### Replication Slot Issues

```bash
# List replication slots
docker exec db-primary psql -U postgres_user -d app_db -c "SELECT * FROM pg_replication_slots;"

# Drop stuck slot if needed (be careful!)
docker exec db-primary psql -U postgres_user -d app_db -c "SELECT pg_drop_replication_slot('slot_name');"
```
