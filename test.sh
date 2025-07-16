#!/bin/bash
echo "=== Testing Cashflow Trends AI ==="
echo ""
echo "1. Testing local Node.js server on port 3000:"
curl -I localhost:3000 || echo 'Server down on 3000'
echo ""
echo "2. Testing HTTPS site:"
curl -I https://cashflowtrends.ai
echo ""
echo "3. PM2 Status:"
pm2 list
echo ""
echo "4. Recent Nginx errors (if any):"
tail -n 20 /var/log/nginx/error.log
