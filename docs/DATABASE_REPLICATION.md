# Database Replication Setup

This document describes the PostgreSQL replication setup for the Payment Orchestration Platform.

## Architecture

The database setup uses PostgreSQL streaming replication with:
- **1 Primary Database**: Handles all write operations
- **2 Replica Databases**: Handle read operations (load balanced)

## Components

### Primary Database (`postgres-primary.yaml`)
- StatefulSet with 1 replica
- Configured with WAL (Write-Ahead Logging) replication
- Exposes service: `postgres-primary`
- Handles all INSERT, UPDATE, DELETE operations

### Replica Databases (`postgres-replica.yaml`)
- StatefulSet with 2 replicas
- Configured as hot standby replicas
- Exposes service: `postgres-replica` (load balanced across replicas)
- Handles all SELECT operations

## Configuration

### Environment Variables

The services use the following environment variables (configured in `configmap.yaml`):
- `DB_HOST`: Points to `postgres-primary` (for writes)
- `DB_REPLICA_HOST`: Points to `postgres-replica` (for reads)

### Secrets

Required secrets in `secrets.yaml`:
- `POSTGRES_PASSWORD`: Password for the main database user
- `POSTGRES_REPLICATION_USER`: Username for replication (default: `replicator`)
- `POSTGRES_REPLICATION_PASSWORD`: Password for replication user

## Application Integration

### Read/Write Separation

All services have been updated to support read/write separation:

1. **Default queries** (`db.query()`) → Use read pool (replicas)
2. **Write queries** (`db.queryWrite()`) → Use write pool (primary)
3. **Transactions** (`db.getWriteClient()`) → Use write pool (primary)

### Service Updates

- **core-banking-service**: Already had read/write separation
- **auth-service**: Updated to use `queryWrite()` for INSERT/UPDATE/DELETE
- **api-gateway-service**: Updated to support read/write separation

### Example Usage

```javascript
const db = require('./config/db');

// Read operation (goes to replica)
const users = await db.query('SELECT * FROM users WHERE is_active = $1', [true]);

// Write operation (goes to primary)
const newUser = await db.queryWrite(
  'INSERT INTO users (user_id, email) VALUES ($1, $2)',
  [userId, email]
);

// Transaction (goes to primary)
const client = await db.getWriteClient();
try {
  await client.query('BEGIN');
  await client.query('UPDATE accounts SET balance = balance - $1', [amount]);
  await client.query('COMMIT');
} finally {
  client.release();
}
```

## Deployment

### Initial Setup

1. Ensure secrets are configured:
   ```bash
   cp k8s/secrets.yaml.example k8s/secrets.yaml
   # Edit k8s/secrets.yaml with your values
   ```

2. Apply the manifests:
   ```bash
   ./k8s/apply.sh
   ```

   Or manually:
   ```bash
   kubectl apply -f k8s/postgres-primary.yaml
   kubectl apply -f k8s/postgres-replica.yaml
   ```

### Verification

Check the status of database pods:
```bash
kubectl get pods -l app=postgres
```

Check replication status on primary:
```bash
kubectl exec -it postgres-primary-0 -- psql -U postgres_user -d app_db -c "SELECT * FROM pg_stat_replication;"
```

Check replica status:
```bash
kubectl exec -it postgres-replica-0 -- psql -U postgres_user -d app_db -c "SELECT pg_is_in_recovery();"
# Should return 't' (true) for replicas
```

## Consistency

PostgreSQL streaming replication provides:
- **Strong consistency**: Replicas receive WAL updates in real-time
- **Minimal lag**: Typically < 1 second replication delay
- **Read-after-write**: For critical reads, use `queryWrite()` to read from primary

## Scaling

To add more read replicas:
1. Update `replicas` in `postgres-replica.yaml`
2. Apply the changes: `kubectl apply -f k8s/postgres-replica.yaml`

The `postgres-replica` service will automatically load balance across all replicas.

## Troubleshooting

### Replica not connecting
- Check if replication user exists on primary
- Verify replication user credentials in secrets
- Check network connectivity between pods

### Replication lag
- Monitor with: `SELECT * FROM pg_stat_replication;` on primary
- Check replica logs: `kubectl logs postgres-replica-0`

### Primary failure
- Replicas will stop receiving updates
- Manual failover required (not automated in this setup)
- Consider using PostgreSQL HA solutions (Patroni, Stolon) for production

## Migration from Single Instance

If you're migrating from the old single-instance setup:

1. The old `postgres.yaml` can be kept for reference but is no longer used
2. Update `configmap.yaml` to point to new services
3. Services will automatically use read/write separation once deployed
