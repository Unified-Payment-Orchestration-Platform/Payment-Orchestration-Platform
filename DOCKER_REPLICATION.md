# Docker Compose Database Replication Setup

This document describes the PostgreSQL replication setup for Docker Compose deployments.

## Architecture

The Docker Compose setup uses PostgreSQL streaming replication with:
- **1 Primary Database** (`db-primary`): Handles all write operations
- **1 Replica Database** (`db-replica`): Handles read operations

## Components

### Primary Database (`db-primary`)
- Configured with WAL (Write-Ahead Logging) replication
- Exposes port 5432 for local tools
- Handles all INSERT, UPDATE, DELETE operations
- Creates replication user automatically on startup

### Replica Database (`db-replica`)
- Configured as hot standby replica
- Streams changes from primary in real-time
- Handles all SELECT operations
- Automatically performs base backup on first startup

## Configuration

### Environment Variables

Create a `.env` file in the project root (or copy from `.env.example`):

```bash
cp .env.example .env
```

Required variables:
- `POSTGRES_USER`: Main database user
- `POSTGRES_PASSWORD`: Main database password
- `POSTGRES_DB`: Database name
- `POSTGRES_REPLICATION_USER`: Replication user (default: `replicator`)
- `POSTGRES_REPLICATION_PASSWORD`: Replication password

### Service Configuration

All services are configured to use:
- `DB_HOST=db-primary` for write operations
- `DB_REPLICA_HOST=db-replica` for read operations

## Usage

### Starting the Stack

```bash
docker-compose up -d
```

This will:
1. Start the primary database
2. Create the replication user
3. Start the replica database
4. Perform initial base backup from primary
5. Start all application services

### Verifying Replication

Check primary status:
```bash
docker exec db-primary psql -U postgres_user -d app_db -c "SELECT * FROM pg_stat_replication;"
```

Check replica status:
```bash
docker exec db-replica psql -U postgres_user -d app_db -c "SELECT pg_is_in_recovery();"
# Should return 't' (true) for replicas
```

Check replication lag:
```bash
docker exec db-primary psql -U postgres_user -d app_db -c "SELECT client_addr, state, sync_state, pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS lag_bytes FROM pg_stat_replication;"
```

### Stopping the Stack

```bash
docker-compose down
```

To remove volumes (⚠️ deletes all data):
```bash
docker-compose down -v
```

## Application Integration

### Read/Write Separation

All services automatically use read/write separation:

1. **Default queries** (`db.query()`) → Use read pool (replica)
2. **Write queries** (`db.queryWrite()`) → Use write pool (primary)
3. **Transactions** (`db.getWriteClient()`) → Use write pool (primary)

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

## Consistency

PostgreSQL streaming replication provides:
- **Strong consistency**: Replicas receive WAL updates in real-time
- **Minimal lag**: Typically < 1 second replication delay
- **Read-after-write**: For critical reads, use `queryWrite()` to read from primary

## Scaling

To add more read replicas, you can:

1. Add additional replica services in `docker-compose.yml`:
```yaml
  db-replica-2:
    # ... same configuration as db-replica
    container_name: db-replica-2
```

2. Use a load balancer or connection pooler (like PgBouncer) to distribute reads across replicas

3. Update services to use multiple replica hosts (comma-separated) if your connection pool supports it

## Troubleshooting

### Replica not connecting
- Check if primary is healthy: `docker ps | grep db-primary`
- Check primary logs: `docker logs db-primary`
- Verify replication user exists: `docker exec db-primary psql -U postgres_user -d app_db -c "\du"`
- Check replica logs: `docker logs db-replica`

### Replication lag
- Monitor with: `docker exec db-primary psql -U postgres_user -d app_db -c "SELECT * FROM pg_stat_replication;"`
- Check network connectivity between containers
- Verify primary has sufficient resources

### Primary failure
- Replicas will stop receiving updates
- Manual failover required (not automated in this setup)
- Consider using PostgreSQL HA solutions (Patroni, Stolon) for production

### Replica stuck in recovery
- Check if primary is accessible: `docker exec db-replica ping db-primary`
- Verify replication user credentials
- Check replica logs for errors
- May need to restart replica: `docker-compose restart db-replica`

## Migration from Single Instance

If you're migrating from the old single-instance setup:

1. The old `db` service has been renamed to `db-primary`
2. Services now use `db-primary` for writes and `db-replica` for reads
3. Old volumes are preserved (renamed to `db-primary-data`)
4. New replica volume (`db-replica-data`) will be created on first startup

## Production Considerations

For production deployments, consider:

1. **Multiple Replicas**: Add more replica instances for better read scaling
2. **Connection Pooling**: Use PgBouncer or similar for connection management
3. **Monitoring**: Set up monitoring for replication lag and database health
4. **Backups**: Implement regular backups from primary
5. **High Availability**: Use tools like Patroni or Stolon for automatic failover
6. **SSL/TLS**: Enable SSL connections between primary and replicas
7. **Resource Limits**: Set appropriate CPU and memory limits for database containers
