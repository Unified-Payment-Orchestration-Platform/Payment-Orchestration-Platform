#!/bin/bash
# This script runs after the database is initialized to create the replication user
# It's executed by the postgres container's docker-entrypoint-initdb.d mechanism

set -e

echo "Setting up replication user..."

# Wait for postgres to be fully ready
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  echo "Waiting for postgres to be ready..."
  sleep 1
done

# Create replication user if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$POSTGRES_REPLICATION_USER') THEN
            CREATE USER $POSTGRES_REPLICATION_USER WITH REPLICATION PASSWORD '$POSTGRES_REPLICATION_PASSWORD';
            RAISE NOTICE 'Replication user created';
        ELSE
            RAISE NOTICE 'Replication user already exists';
        END IF;
    END
    \$\$;
EOSQL

# Update pg_hba.conf to allow replication from Docker network
echo "Updating pg_hba.conf for replication..."
PG_HBA_FILE="/var/lib/postgresql/data/pgdata/pg_hba.conf"
if ! grep -q "host.*replication.*all.*0.0.0.0/0.*md5" "$PG_HBA_FILE"; then
    echo "host    replication     all             0.0.0.0/0               md5" >> "$PG_HBA_FILE"
    echo "Added replication entry to pg_hba.conf"
    # Reload PostgreSQL configuration
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "SELECT pg_reload_conf();"
else
    echo "Replication entry already exists in pg_hba.conf"
fi

echo "Replication setup complete!"
