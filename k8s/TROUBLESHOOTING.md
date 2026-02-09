# Kubernetes Troubleshooting Guide

## Issue: Pods Stuck in Pending State - Insufficient CPU

### Problem
When running `./k8s/apply.sh`, pods remain in `Pending` state with error:
```
0/1 nodes are available: 1 Insufficient cpu
```

### Solution Options

#### Option 1: Increase Minikube Resources (Recommended)
```bash
# Stop minikube
minikube stop

# Start with more resources
minikube start --cpus=4 --memory=4096

# Or if using Docker driver
minikube start --cpus=4 --memory=4096 --driver=docker
```

#### Option 2: Reduce Resource Requests
Edit the deployment YAMLs to reduce CPU/memory requests:
- `k8s/api-gateway.yaml`
- `k8s/auth-service.yaml`
- `k8s/core-banking-service.yaml`

Reduce `resources.requests.cpu` from `100m` to `50m` or less.

#### Option 3: Scale Down Other Services
```bash
# Scale down non-essential services
kubectl scale deployment zookeeper --replicas=0
kubectl scale deployment frontend --replicas=0
```

#### Option 4: Use Docker Compose for Development
For local development, Docker Compose is often easier:
```bash
docker-compose up -d
```

## Issue: Demo Script Not Working with Kubernetes

### Problem
Demo script tries to connect to `http://localhost:80` but Kubernetes services are on different ports.

### Solution
The demo script has been updated to auto-detect the environment. For Kubernetes, use:
```bash
# Set environment variable
export GATEWAY_URL=http://localhost:30000
node demo/demo-script.js

# Or modify demo-script.js to use port 30000
```

### Port Mappings
- **API Gateway**: NodePort 30000 (http://localhost:30000)
- **Auth Service**: ClusterIP only (internal)
- **Core Banking**: ClusterIP only (internal)
- **Frontend**: NodePort 30002 (http://localhost:30002)

## Issue: Database Replication Not Working

### Check Primary Status
```bash
kubectl exec postgres-primary-0 -c postgres -- psql -U postgres_user -d app_db -c "SELECT pg_is_in_recovery();"
# Should return: f (false = primary)
```

### Check Replica Status
```bash
kubectl exec postgres-replica-0 -c postgres -- psql -U postgres_user -d app_db -c "SELECT pg_is_in_recovery();"
# Should return: t (true = replica)
```

### Fix Replication Connection Issues
```bash
# Add replication entry to pg_hba.conf
kubectl exec postgres-primary-0 -c postgres -- sh -c "echo 'host    replication     all             0.0.0.0/0               md5' >> /var/lib/postgresql/data/pgdata/pg_hba.conf && psql -U postgres_user -d app_db -c 'SELECT pg_reload_conf();'"

# Restart replica
kubectl delete pod postgres-replica-0
```

## Common Commands

### Check Pod Status
```bash
kubectl get pods
kubectl get pods -o wide
kubectl describe pod <pod-name>
```

### Check Service Status
```bash
kubectl get services
kubectl get endpoints
```

### View Logs
```bash
kubectl logs <pod-name>
kubectl logs -l app=<app-name>
kubectl logs <pod-name> -c <container-name>  # For multi-container pods
```

### Check Resource Usage
```bash
kubectl top nodes
kubectl top pods
```

### Port Forward for Testing
```bash
# Forward API Gateway to localhost
kubectl port-forward service/api-gateway-service 3000:3000

# Then use http://localhost:3000 in demo script
```

## Quick Fixes

### Restart All Services
```bash
kubectl rollout restart deployment/api-gateway-service
kubectl rollout restart deployment/auth-service
kubectl rollout restart deployment/core-banking-service
```

### Delete and Recreate
```bash
kubectl delete deployment api-gateway-service
kubectl apply -f k8s/api-gateway.yaml
```

### Check ConfigMaps and Secrets
```bash
kubectl get configmaps
kubectl get secrets
kubectl describe configmap app-config
kubectl describe secret app-secrets
```
