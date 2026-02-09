# Kubernetes Configuration Fixes

This document summarizes all the fixes applied to the Kubernetes configuration files.

## Issues Fixed

### 1. **postgres.yaml**
- ✅ **Fixed**: Updated init script ConfigMap to match the complete database schema from `database/init.sql`
- ✅ **Added**: Health probes (liveness and readiness) using `pg_isready`
- ✅ **Added**: Resource limits and requests for PostgreSQL container

### 2. **configmap.yaml**
- ✅ **Added**: `DB_REPLICA_HOST` environment variable (defaults to primary postgres service)

### 3. **core-banking-service.yaml**
- ✅ **Added**: `DB_REPLICA_HOST` environment variable reference
- ✅ **Added**: Health probes (liveness and readiness) pointing to `/health` endpoint
- ✅ **Added**: Resource limits and requests

### 4. **auth-service.yaml**
- ✅ **Added**: Health probes (liveness and readiness) pointing to `/health` endpoint
- ✅ **Added**: Resource limits and requests

### 5. **notification-service.yaml**
- ✅ **Added**: Health probes (liveness and readiness) pointing to `/health` endpoint
- ✅ **Added**: Resource limits and requests

### 6. **api-gateway.yaml**
- ✅ **Added**: Service URL environment variables from ConfigMap (AUTH_SERVICE_URL, CORE_BANKING_SERVICE_URL, NOTIFICATION_SERVICE_URL)
- ✅ **Added**: Health probes (liveness and readiness) pointing to `/health` endpoint
- ✅ **Added**: Resource limits and requests

### 7. **kafka.yaml**
- ⚠️ **Needs Manual Fix**: Remove `PLAINTEXT_HOST` listener from `KAFKA_LISTENER_SECURITY_PROTOCOL_MAP` and `KAFKA_LISTENERS`
  - Change `KAFKA_LISTENER_SECURITY_PROTOCOL_MAP` from `"PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT"` to `"PLAINTEXT:PLAINTEXT"`
  - Change `KAFKA_LISTENERS` from `"PLAINTEXT://0.0.0.0:9092,PLAINTEXT_HOST://0.0.0.0:29092"` to `"PLAINTEXT://0.0.0.0:9092"`
  - The `KAFKA_ADVERTISED_LISTENERS` should remain as `"PLAINTEXT://kafka:9092"` (already correct)
- ✅ **Added**: Health probes using `kafka-broker-api-versions` command
- ✅ **Added**: Resource limits and requests
- ✅ **Added**: Additional Kafka configuration (session timeout, connection timeout, auto-create topics)

### 8. **zookeeper.yaml**
- ✅ **Added**: Health probes using `ruok` command
- ✅ **Added**: Resource limits and requests

### 9. **frontend.yaml**
- ✅ **Fixed**: Updated `NEXT_PUBLIC_NOTIFICATION_SERVICE_URL` to use API Gateway endpoint
- ✅ **Added**: Health probes (liveness and readiness) pointing to `/` endpoint
- ✅ **Added**: Resource limits and requests

### 10. **secrets.yaml**
- ✅ **Created**: `secrets.yaml.example` template file with all required secrets
- **Action Required**: Copy `k8s/secrets.yaml.example` to `k8s/secrets.yaml` and fill in your actual secret values

### 11. **apply.sh**
- ✅ **Fixed**: Added check for `secrets.yaml` existence before applying
- ✅ **Added**: Wait logic for infrastructure services (Zookeeper, Kafka, PostgreSQL)
- ✅ **Improved**: Better error handling and status messages

## Manual Fix Required

### Kafka Configuration
The `k8s/kafka.yaml` file needs a manual fix for the listener configuration. Update lines 39-42:

```yaml
# Change from:
- name: KAFKA_LISTENER_SECURITY_PROTOCOL_MAP
  value: "PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT"
- name: KAFKA_LISTENERS
  value: "PLAINTEXT://0.0.0.0:9092,PLAINTEXT_HOST://0.0.0.0:29092"

# To:
- name: KAFKA_LISTENER_SECURITY_PROTOCOL_MAP
  value: "PLAINTEXT:PLAINTEXT"
- name: KAFKA_LISTENERS
  value: "PLAINTEXT://0.0.0.0:9092"
```

The `PLAINTEXT_HOST` listener is not needed in Kubernetes since services communicate via internal DNS.

## Setup Instructions

1. **Create secrets file**:
   ```bash
   cp k8s/secrets.yaml.example k8s/secrets.yaml
   # Edit k8s/secrets.yaml with your actual values
   ```

2. **Apply configurations**:
   ```bash
   chmod +x k8s/apply.sh
   ./k8s/apply.sh
   ```

3. **Verify deployment**:
   ```bash
   kubectl get pods
   kubectl get services
   ```

## Resource Limits Summary

All services now have appropriate resource limits:
- **PostgreSQL**: 256Mi-512Mi memory, 250m-500m CPU
- **Zookeeper**: 256Mi-512Mi memory, 250m-500m CPU
- **Kafka**: 512Mi-1Gi memory, 500m-1000m CPU
- **Core Banking Service**: 256Mi-512Mi memory, 250m-500m CPU
- **Auth Service**: 128Mi-256Mi memory, 100m-250m CPU
- **Notification Service**: 128Mi-256Mi memory, 100m-250m CPU
- **API Gateway**: 128Mi-256Mi memory, 100m-250m CPU
- **Frontend**: 256Mi-512Mi memory, 250m-500m CPU
