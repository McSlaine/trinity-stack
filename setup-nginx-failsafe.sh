#!/bin/bash

echo "Setting up Nginx Failsafe Mechanisms..."

# Make scripts executable
chmod +x nginx-failsafe.sh

# Create systemd override directory for nginx
echo "1. Creating systemd override for nginx auto-restart..."
sudo mkdir -p /etc/systemd/system/nginx.service.d/
sudo cp nginx-auto-restart.conf /etc/systemd/system/nginx.service.d/override.conf

# Install the monitor service
echo "2. Installing nginx monitor service..."
sudo cp nginx-monitor.service /etc/systemd/system/
sudo systemctl daemon-reload

# Enable services
echo "3. Enabling services..."
sudo systemctl enable nginx
sudo systemctl enable nginx-monitor

# Create a cron job for additional safety
echo "4. Setting up cron job for nginx health check..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/cashflow-trends-ai/nginx-failsafe.sh start >/dev/null 2>&1") | crontab -

# Create log rotation for nginx-failsafe logs
echo "5. Setting up log rotation..."
sudo tee /etc/logrotate.d/nginx-failsafe > /dev/null << 'EOF'
/var/log/nginx-failsafe.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
EOF

# Start nginx with the failsafe script
echo "6. Starting nginx with failsafe..."
./nginx-failsafe.sh start

# Start the monitor service
echo "7. Starting nginx monitor service..."
sudo systemctl start nginx-monitor

echo ""
echo "Nginx Failsafe Setup Complete!"
echo ""
echo "Features enabled:"
echo "✓ Nginx auto-restart on crash (via systemd)"
echo "✓ Nginx monitor service checking every 30 seconds"
echo "✓ Cron job checking every 5 minutes as backup"
echo "✓ Automatic configuration validation before start"
echo "✓ Logging to /var/log/nginx-failsafe.log"
echo ""
echo "Useful commands:"
echo "- Check nginx status: ./nginx-failsafe.sh status"
echo "- Restart nginx safely: ./nginx-failsafe.sh restart"
echo "- View monitor logs: journalctl -u nginx-monitor -f"
echo "- View nginx logs: journalctl -u nginx -f" 