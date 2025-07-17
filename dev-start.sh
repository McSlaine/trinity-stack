#!/bin/bash

echo "🚀 Starting Cashflow Trends AI Development Environment"
echo "=============================================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
fi

# Stop any running instance
echo "🛑 Stopping any existing instances..."
pm2 stop cashflow-ai-dev 2>/dev/null || true
pm2 delete cashflow-ai-dev 2>/dev/null || true

# Clear PM2 logs
echo "🧹 Clearing old logs..."
pm2 flush

# Start the application
echo "🎯 Starting development server..."
pm2 start ecosystem.config.js

# Show status and logs
echo "📊 Application Status:"
pm2 status

echo ""
echo "🎯 =========================================="
echo "🎯 Development server starting..."
echo "🎯 Access URL: http://localhost:3000"
echo "🎯 Health Check: http://localhost:3000/health"
echo "🎯 MYOB OAuth: http://localhost:3000/auth/myob"
echo "🎯 =========================================="
echo ""
echo "📋 Useful commands:"
echo "   pm2 logs           - View live logs"
echo "   pm2 status         - Check status"
echo "   pm2 restart all    - Restart app"
echo "   pm2 stop all       - Stop app"
echo "   pm2 delete all     - Remove app from PM2"
echo ""

# Follow logs
echo "📋 Following logs (Ctrl+C to exit)..."
pm2 logs cashflow-ai-dev --lines 50 