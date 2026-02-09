# Kubernetes Deployment Guide

## What Should Be Running

### Infrastructure Services (Required)
1. **PostgreSQL** (`postgres-0`)
   - Database for the application
   - Should be: `1/1 Running`
   - Service: `postgres:5432`

2. **Zookeeper** (`zookeeper-*`)
   - Required for Kafka coordination
   - Should be: `1/1 Running`
   - Service: `zookeeper:2181`

3. **Kafka** (`kafka-0`)
   - Message broker for event-driven architecture
   - Should be: `1/1 Running`
   - Service: `kafka:9092`

### Application Services (Deploy after infrastructure is ready)
4. **Auth Service** (`auth-service-*`)
   - Authentication and authorization
   - Service: `auth-service:3001`

5. **Core Banking Service** (`core-banking-service-*`)
   - Core financial operations
   - Service: `core-banking-service:3005`

6. **Notification Service** (`notification-service-*`)
   - Handles notifications (email, SMS)
   - Service: `notification-service:3006`

7. **API Gateway** (`api-gateway-service-*`)
   - Main entry point for API requests
   - Service: `api-gateway-service:3000` (NodePort: 30000)

8. **Frontend** (`frontend-*`)
   - Web interface
   - Service: `frontend:3000` (NodePort: 30002)

## Quick Status Check

```bash
# Check all pods
kubectl get pods

# Check all services
kubectl get services

# Check everything
kubectl get all
```

## Verification

Run the verification script:

```bash
./k8s/verify.sh
```

This script will:
- Check pod status
- Verify services are created
- Test database connectivity
- Test service health endpoints
- Show resource usage

## Manual Verification Steps

### 1. Check Infrastructure
```bash
# PostgreSQL
kubectl get pod postgres-0
kubectl logs postgres-0 --tail=20

# Zookeeper
kubectl get pod -l app=zookeeper
kubectl logs -l app=zookeeper --tail=20

# Kafka
kubectl get pod kafka-0
kubectl logs kafka-0 --tail=20
```

### 2. Test Database
```bash
# Connect to PostgreSQL
kubectl run postgres-client --rm -it --image=postgres:16-alpine --restart=Never -- \
  psql -h postgres -U postgres_user -d app_db
```

### 3. Test Services (after deployment)
```bash
# Test auth service
kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- \
  curl http://auth-service:3001/health

# Test core banking service
kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- \
  curl http://core-banking-service:3005/health

# Test API Gateway (from outside cluster)
curl http://localhost:30000/health
```

### 4. Check Logs
```bash
# View logs for a specific pod
kubectl logs <pod-name>

# Follow logs
kubectl logs -f <pod-name>

# View logs from all pods with a label
kubectl logs -l app=<service-name>
```

### 5. Debug Issues
```bash
# Describe a pod to see events and status
kubectl describe pod <pod-name>

# Check events
kubectl get events --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods
kubectl top nodes
```

## Common Issues

### Pods in CrashLoopBackOff
1. Check logs: `kubectl logs <pod-name>`
2. Check previous logs: `kubectl logs <pod-name> --previous`
3. Describe pod: `kubectl describe pod <pod-name>`

### Services Not Accessible
1. Verify service exists: `kubectl get service <service-name>`
2. Check endpoints: `kubectl get endpoints <service-name>`
3. Verify pod labels match service selector

### Database Connection Issues
1. Verify PostgreSQL is running: `kubectl get pod postgres-0`
2. Check database credentials in secrets: `kubectl get secret app-secrets`
3. Test connection manually (see above)

## Deployment Order

1. **Infrastructure First**:
   ```bash
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/secrets.yaml
   kubectl apply -f k8s/postgres.yaml
   kubectl apply -f k8s/zookeeper.yaml
   kubectl apply -f k8s/kafka.yaml
   ```

2. **Wait for Infrastructure**:
   ```bash
   kubectl wait --for=condition=ready pod -l app=postgres --timeout=300s
   kubectl wait --for=condition=ready pod -l app=zookeeper --timeout=300s
   kubectl wait --for=condition=ready pod -l app=kafka --timeout=300s
   ```

3. **Deploy Applications**:
   ```bash
   kubectl apply -f k8s/auth-service.yaml
   kubectl apply -f k8s/core-banking-service.yaml
   kubectl apply -f k8s/notification-service.yaml
   kubectl apply -f k8s/api-gateway.yaml
   kubectl apply -f k8s/frontend.yaml
   ```

Or use the automated script:
```bash
./k8s/apply.sh
```

## Accessing Services

### From Outside the Cluster

- **API Gateway**: `http://localhost:30000` (NodePort)
- **Frontend**: `http://localhost:30002` (NodePort)
- **PostgreSQL**: Port forward: `kubectl port-forward svc/postgres 5432:5432`

### From Inside the Cluster

Services are accessible via their DNS names:
- `http://auth-service:3001`
- `http://core-banking-service:3005`
- `http://notification-service:3006`
- `http://api-gateway-service:3000`
- `http://postgres:5432`
- `kafka:9092`

## Next Steps

1. Build Docker images for your services
2. Push images to a registry (or use local images with minikube)
3. Update image pull policies if needed
4. Deploy application services
5. Run verification script
