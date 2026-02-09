#!/bin/sh
# This script sets up the PostgreSQL replica by performing base backup from primary

set -e

echo "Starting replica setup..."

# Get primary hostname from environment variable (set in docker-compose.yml)
PRIMARY_HOST="${POSTGRES_MASTER_SERVICE:-db-primary}"

# Wait for primary to be ready
echo "Waiting for primary database ($PRIMARY_HOST) to be ready..."
until pg_isready -h "$PRIMARY_HOST" -p 5432; do
  echo "Waiting for primary database..."
  sleep 2
done

# Wait a bit for replication user to be created
echo "Waiting for replication user to be available..."
sleep 5

# Check if data directory is empty
if [ ! -d /var/lib/postgresql/data/pgdata ] || [ -z "$(ls -A /var/lib/postgresql/data/pgdata 2>/dev/null)" ]; then
  echo "Initializing replica from primary..."
  
  # Perform base backup
  PGPASSWORD="$POSTGRES_REPLICATION_PASSWORD" pg_basebackup \
    -h "$PRIMARY_HOST" \
    -U "$POSTGRES_REPLICATION_USER" \
    -D /var/lib/postgresql/data/pgdata \
    -P \
    -W \
    -R \
    -X stream \
    -v
  
  echo "Base backup completed"
else
  echo "Data directory already exists, skipping base backup"
fi

# Ensure standby.signal exists
touch /var/lib/postgresql/data/pgdata/standby.signal

# Start postgres in recovery mode
echo "Starting PostgreSQL in recovery mode..."
exec docker-entrypoint.sh postgres \
  -c hot_standby=on \
  -c max_standby_streaming_delay=30s
