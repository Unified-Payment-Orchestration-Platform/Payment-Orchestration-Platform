#!/bin/bash

# Script to demonstrate database failover and resilience
# This allows you to stop/start primary databases to show how the system handles failures

case "$1" in
    stop-auth)
        echo "🛑 Stopping Auth Primary Database..."
        docker stop db-auth-primary
        echo "✅ Auth Primary DB stopped"
        echo "📊 The system should now use db-auth-replica for reads"
        echo "⚠️  Writes will fail until primary is restored"
        ;;
    start-auth)
        echo "🟢 Starting Auth Primary Database..."
        docker start db-auth-primary
        echo "✅ Auth Primary DB started"
        echo "⏳ Waiting for health check..."
        sleep 5
        docker ps | grep db-auth-primary
        ;;
    stop-core)
        echo "🛑 Stopping Core Banking Primary Database..."
        docker stop db-core-banking-primary
        echo "✅ Core Banking Primary DB stopped"
        echo "📊 The system should now use db-core-banking-replica for reads"
        echo "⚠️  Writes will fail until primary is restored"
        ;;
    start-core)
        echo "🟢 Starting Core Banking Primary Database..."
        docker start db-core-banking-primary
        echo "✅ Core Banking Primary DB started"
        echo "⏳ Waiting for health check..."
        sleep 5
        docker ps | grep db-core-banking-primary
        ;;
    status)
        echo "📊 Database Status:"
        echo ""
        echo "Auth Databases:"
        docker ps -a | grep db-auth
        echo ""
        echo "Core Banking Databases:"
        docker ps -a | grep db-core-banking
        ;;
    *)
        echo "Usage: $0 {stop-auth|start-auth|stop-core|start-core|status}"
        echo ""
        echo "Commands:"
        echo "  stop-auth   - Stop Auth Primary DB (demonstrate failover)"
        echo "  start-auth  - Start Auth Primary DB (restore service)"
        echo "  stop-core   - Stop Core Banking Primary DB (demonstrate failover)"
        echo "  start-core  - Start Core Banking Primary DB (restore service)"
        echo "  status      - Show status of all databases"
        echo ""
        echo "Example demonstration flow:"
        echo "  1. $0 status              # Show current state"
        echo "  2. $0 stop-auth           # Stop auth primary"
        echo "  3. # Run demo script - show reads still work via replica"
        echo "  4. $0 start-auth          # Restore primary"
        exit 1
        ;;
esac
