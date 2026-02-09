# SSH Port Forwarding Setup Guide

## ✅ Your SSH Command (Ready to Use)

```bash
ssh -i ~/.ssh/saad-key.pem -L 3002:localhost:3002 -L 8000:localhost:80 -L 8080:localhost:8080 -L 8025:localhost:8025 -L 3001:localhost:3001 -L 3005:localhost:3005 -L 3006:localhost:3006 -L 5432:localhost:5432 ubuntu@13.220.212.159
```

## 📋 Port Mappings

| Local Port | Server Port | Service | Access URL |
|------------|-------------|---------|------------|
| 3002 | 3002 | Frontend (Next.js) | http://localhost:3002 |
| 8000 | 80 | API Gateway (nginx) | http://localhost:8000 |
| 8080 | 8080 | Kafka UI | http://localhost:8080 |
| 8025 | 8025 | MailHog Web UI | http://localhost:8025 |
| 3001 | 3001 | Auth Service | http://localhost:3001 |
| 3005 | 3005 | Core Banking Service | http://localhost:3005 |
| 3006 | 3006 | Notification Service | http://localhost:3006 |
| 5432 | 5432 | PostgreSQL | localhost:5432 |

## 🚀 Quick Start Steps

### 1. Run SSH Port Forwarding
Copy and paste this command in your **local terminal**:

```bash
ssh -i ~/.ssh/saad-key.pem -L 3002:localhost:3002 -L 8000:localhost:80 -L 8080:localhost:8080 -L 8025:localhost:8025 -L 3001:localhost:3001 -L 3005:localhost:3005 -L 3006:localhost:3006 -L 5432:localhost:5432 ubuntu@13.220.212.159
```

**Keep this terminal window open** - the SSH session must stay active.

### 2. Access the Application

Once the SSH tunnel is established, open your browser and go to:

- **Frontend Application**: http://localhost:3002
- **API Gateway Health**: http://localhost:8000/health
- **Kafka UI**: http://localhost:8080
- **MailHog**: http://localhost:8025

### 3. Test the Connection

Test that the API Gateway is accessible:

```bash
curl http://localhost:8000/health
```

You should see:
```json
{"status":"healthy","db":"connected","timestamp":"..."}
```

## ✅ Frontend Configuration

The frontend is already configured to use `http://localhost:8000` for API calls when accessed via SSH port forwarding.

**Configuration file**: `frontend/payment-client/payment-client/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🔧 Troubleshooting

### Issue: "Network Error" when signing in

**Solution**: 
1. Make sure the SSH port forwarding is active and includes `-L 8000:localhost:80`
2. Verify the API Gateway is accessible: `curl http://localhost:8000/health`
3. Check browser console for the actual error message

### Issue: "Connection refused"

**Solution**:
1. Verify the frontend server is running on the remote server
2. Check that all Docker services are running: `docker-compose ps`
3. Ensure the SSH tunnel is established (keep the SSH session open)

### Issue: Frontend can't connect to API

**Solution**:
1. Open browser DevTools (F12) → Console tab
2. Look for the API URL being used (should show `http://localhost:8000`)
3. Verify the SSH port forwarding includes port 8000

## 📝 Notes

- **Keep the SSH session open** while using the application
- The frontend runs on the **server** (port 3002), but you access it via SSH forwarding
- All API calls from the frontend go to `http://localhost:8000` (which forwards to server's port 80)
- If you close the SSH session, you'll lose access to all services

## 🎯 What Happens When You Sign In

1. Frontend (browser) sends request to `http://localhost:8000/auth/login`
2. SSH tunnel forwards this to `localhost:80` on the server
3. Nginx proxies to API Gateway (port 3000 internally)
4. API Gateway forwards to Auth Service (port 3001)
5. Response comes back through the same path

Everything is configured and ready! Just run the SSH command and access http://localhost:3002
