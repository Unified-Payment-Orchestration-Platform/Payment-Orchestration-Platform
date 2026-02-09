# Database Replication Setup Guide

This guide covers database replication setup for both **Docker Compose** and **Kubernetes** deployments.

## Quick Start

### Docker Compose

1. **Add replication variables to your `.env` file**:
   ```bash
   POSTGRES_REPLICATION_USER=replicator
   POSTGRES_REPLICATION_PASSWORD=your-secure-replication-password
   ```

2. **Start the stack**:
   ```bash
   docker-compose up -d
   ```

3. **Verify replication**:
   ```bash
   # Check primary
   docker exec db-primary psql -U postgres_user -d app_db -c "SELECT * FROM pg_stat_replication;"
   
   # Check replica
   docker exec db-replica psql -U postgres_user -d app_db -c "SELECT pg_is_in_recovery();"
   ```

### Kubernetes

1. **Update secrets**:
   ```bash
   cp k8s/secrets.yaml.example k8s/secrets.yaml
   # Edit k8s/secrets.yaml and add:
   #   POSTGRES_REPLICATION_USER: "replicator"
   #   POSTGRES_REPLICATION_PASSWORD: "your-secure-replication-password"
   ```

2. **Deploy**:
   ```bash
   ./k8s/apply.sh
   ```

3. **Verify**:
   ```bash
   kubectl get pods -l app=postgres
   kubectl exec -it postgres-primary-0 -- psql -U postgres_user -d app_db -c "SELECT * FROM pg_stat_replication;"
   ```

## Architecture

Both setups provide:
- **1 Primary Database**: Handles all writes (INSERT, UPDATE, DELETE)
- **Multiple Replicas**: Handle reads (SELECT) - load balanced
  - Docker Compose: 1 replica
  - Kubernetes: 2 replicas (configurable)

## Application Usage

All services automatically use read/write separation:

```javascript
const db = require('./config/db');

// ✅ Read operations → Replica
const users = await db.query('SELECT * FROM users');

// ✅ Write operations → Primary
await db.queryWrite('INSERT INTO users ...');

// ✅ Transactions → Primary
const client = await db.getWriteClient();
try {
  await client.query('BEGIN');
  // ... operations
  await client.query('COMMIT');
} finally {
  client.release();
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Primary database host | `db-primary` (Docker) / `postgres-primary` (K8s) |
| `DB_REPLICA_HOST` | Replica database host | `db-replica` (Docker) / `postgres-replica` (K8s) |
| `POSTGRES_REPLICATION_USER` | Replication user | `replicator` |
| `POSTGRES_REPLICATION_PASSWORD` | Replication password | (required) |

## Consistency & Performance

- **Strong Consistency**: Streaming replication with < 1 second lag
- **Read Scaling**: Distribute read load across multiple replicas
- **Write Performance**: All writes go to single primary (no conflicts)
- **Read-After-Write**: Use `queryWrite()` for critical reads that need latest data

## Documentation

- **Docker Compose**: See [DOCKER_REPLICATION.md](./DOCKER_REPLICATION.md)
- **Kubernetes**: See [k8s/DATABASE_REPLICATION.md](./k8s/DATABASE_REPLICATION.md)

## Troubleshooting

### Replica not connecting
- Check primary is healthy
- Verify replication user exists
- Check network connectivity
- Review logs: `docker logs db-replica` or `kubectl logs postgres-replica-0`

### High replication lag
- Monitor: `SELECT * FROM pg_stat_replication;`
- Check network bandwidth
- Verify primary has sufficient resources
- Consider increasing `max_wal_senders` if needed

### Services can't connect
- Verify environment variables are set correctly
- Check service dependencies in docker-compose/k8s manifests
- Ensure databases are healthy before starting services

## Migration Notes

If migrating from single-instance setup:
- Old `db` service → `db-primary` (Docker) or `postgres-primary` (K8s)
- Services automatically use read/write separation once deployed
- Data volumes are preserved (renamed appropriately)
