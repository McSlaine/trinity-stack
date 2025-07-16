#!/bin/bash

# Nginx Failsafe Script
# This script ensures nginx stays running and recovers from failures

# Function to check if nginx is running
check_nginx() {
    if systemctl is-active --quiet nginx; then
        return 0
    else
        return 1
    fi
}

# Function to test nginx configuration
test_nginx_config() {
    nginx -t 2>/dev/null
    return $?
}

# Function to start nginx with retry logic
start_nginx() {
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "[$(date)] Attempt $attempt to start nginx..."
        
        # Test configuration first
        if ! test_nginx_config; then
            echo "[$(date)] ERROR: Nginx configuration test failed!"
            nginx -t 2>&1 | tee -a /var/log/nginx-failsafe.log
            return 1
        fi
        
        # Try to start nginx
        systemctl start nginx
        sleep 2
        
        if check_nginx; then
            echo "[$(date)] SUCCESS: Nginx started successfully"
            return 0
        else
            echo "[$(date)] WARNING: Nginx failed to start on attempt $attempt"
            ((attempt++))
        fi
    done
    
    echo "[$(date)] ERROR: Failed to start nginx after $max_attempts attempts"
    return 1
}

# Function to restart nginx safely
restart_nginx() {
    echo "[$(date)] Restarting nginx..."
    
    # First try reload (zero downtime)
    if systemctl reload nginx 2>/dev/null; then
        echo "[$(date)] Nginx reloaded successfully"
        return 0
    fi
    
    # If reload fails, do a full restart
    systemctl restart nginx
    sleep 2
    
    if check_nginx; then
        echo "[$(date)] Nginx restarted successfully"
        return 0
    else
        # If restart failed, try to start it
        start_nginx
    fi
}

# Main monitoring loop (if run with 'monitor' argument)
if [ "$1" = "monitor" ]; then
    echo "[$(date)] Starting nginx monitor..."
    
    while true; do
        if ! check_nginx; then
            echo "[$(date)] ALERT: Nginx is down! Attempting to restart..."
            start_nginx
            
            # Send alert (you can customize this)
            # echo "Nginx was down and restarted at $(date)" | mail -s "Nginx Alert" admin@example.com
        fi
        
        # Check every 30 seconds
        sleep 30
    done
elif [ "$1" = "start" ]; then
    start_nginx
elif [ "$1" = "restart" ]; then
    restart_nginx
elif [ "$1" = "status" ]; then
    if check_nginx; then
        echo "Nginx is running"
        systemctl status nginx --no-pager
    else
        echo "Nginx is NOT running"
        exit 1
    fi
else
    echo "Usage: $0 {start|restart|status|monitor}"
    echo "  start   - Start nginx with retry logic"
    echo "  restart - Safely restart nginx"
    echo "  status  - Check nginx status"
    echo "  monitor - Run continuous monitoring (daemon mode)"
fi 