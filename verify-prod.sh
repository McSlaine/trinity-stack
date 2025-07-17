#!/bin/bash

# verify-prod.sh - Production Readiness Verification Script
# Run this before any production deployment to catch development workarounds

echo "🔍 PRODUCTION READINESS VERIFICATION"
echo "===================================="
echo ""

ERRORS=0
WARNINGS=0

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        ((ERRORS++))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "1. 🌐 HTTPS Health Check"
echo "------------------------"
if curl -s -f -I https://cashflowtrends.ai/health > /dev/null 2>&1; then
    HEALTH_STATUS=$(curl -s https://cashflowtrends.ai/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$HEALTH_STATUS" = "OK" ]; then
        print_status 0 "HTTPS health endpoint responding: $HEALTH_STATUS"
    else
        print_status 1 "Health endpoint returned: $HEALTH_STATUS"
    fi
else
    print_status 1 "HTTPS health endpoint not accessible"
fi
echo ""

echo "2. 🔍 Environment Variable Security Check"
echo "-----------------------------------------"
if [ -f ".env" ]; then
    # Check for localhost URLs
    LOCALHOST_COUNT=$(grep -i "localhost\|127\.0\.0\.1" .env 2>/dev/null | wc -l)
    if [ $LOCALHOST_COUNT -eq 0 ]; then
        print_status 0 "No localhost URLs found in .env"
    else
        print_status 1 "Found $LOCALHOST_COUNT localhost URLs in .env:"
        grep -i "localhost\|127\.0\.0\.1" .env
    fi
    
    # Check for HTTP URLs in OAuth settings
    HTTP_OAUTH=$(grep -i "MYOB_REDIRECT_URI.*http://" .env 2>/dev/null | wc -l)
    if [ $HTTP_OAUTH -eq 0 ]; then
        print_status 0 "MYOB OAuth uses HTTPS"
    else
        print_status 1 "MYOB OAuth still using HTTP (MYOB requires HTTPS)"
        grep -i "MYOB_REDIRECT_URI" .env
    fi
    
    # Check NODE_ENV
    NODE_ENV=$(grep "NODE_ENV" .env 2>/dev/null | cut -d'=' -f2)
    if [ "$NODE_ENV" = "production" ]; then
        print_status 0 "NODE_ENV set to production"
    else
        print_warning "NODE_ENV is '$NODE_ENV' (should be 'production' for prod)"
    fi
else
    print_status 1 ".env file not found"
fi
echo ""

echo "3. 🔒 SSL Security Audit"
echo "------------------------"
# Check for SSL workarounds in code
SSL_WORKAROUNDS=$(grep -r "rejectUnauthorized.*false" . --exclude-dir=node_modules --exclude-dir=.git --exclude="verify-prod.sh" 2>/dev/null | wc -l)
if [ $SSL_WORKAROUNDS -eq 0 ]; then
    print_status 0 "No SSL security workarounds found"
else
    print_status 1 "Found $SSL_WORKAROUNDS SSL security workarounds:"
    grep -r "rejectUnauthorized.*false" . --exclude-dir=node_modules --exclude-dir=.git --exclude="verify-prod.sh" 2>/dev/null
fi

# Check for development SSL bypasses
SSL_BYPASSES=$(grep -r "ssl.*false\|checkServerIdentity.*undefined" . --exclude-dir=node_modules --exclude-dir=.git --exclude="verify-prod.sh" 2>/dev/null | wc -l)
if [ $SSL_BYPASSES -eq 0 ]; then
    print_status 0 "No SSL bypasses found"
else
    print_warning "Found $SSL_BYPASSES potential SSL bypasses (review if appropriate for dev mode)"
fi
echo ""

echo "4. 🚀 PM2 Process Status"
echo "-----------------------"
if command -v pm2 > /dev/null 2>&1; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null | jq -r '.[].pm2_env.status' 2>/dev/null | head -1)
    if [ "$PM2_STATUS" = "online" ]; then
        print_status 0 "PM2 process running"
        print_info "PM2 processes:"
        pm2 list --no-color
    else
        print_status 1 "PM2 process not online (status: $PM2_STATUS)"
    fi
else
    print_status 1 "PM2 not installed or not in PATH"
fi
echo ""

echo "5. 📜 SSL Certificate Status"
echo "----------------------------"
if command -v certbot > /dev/null 2>&1; then
    if sudo certbot certificates 2>/dev/null | grep -q "cashflowtrends.ai"; then
        print_status 0 "SSL certificates found for cashflowtrends.ai"
        print_info "Certificate details:"
        sudo certbot certificates | grep -A 5 "cashflowtrends.ai"
        
        # Check certificate expiry
        CERT_EXPIRY=$(sudo certbot certificates 2>/dev/null | grep -A 3 "cashflowtrends.ai" | grep "Expiry Date" | head -1)
        if [ ! -z "$CERT_EXPIRY" ]; then
            print_info "$CERT_EXPIRY"
        fi
    else
        print_status 1 "No SSL certificates found for cashflowtrends.ai"
    fi
    
    # Test certificate renewal
    if sudo certbot renew --dry-run > /dev/null 2>&1; then
        print_status 0 "Certificate auto-renewal working"
    else
        print_warning "Certificate auto-renewal may have issues"
    fi
else
    print_status 1 "Certbot not installed"
fi
echo ""

echo "6. 🌐 Nginx Configuration"
echo "-------------------------"
if command -v nginx > /dev/null 2>&1; then
    if nginx -t > /dev/null 2>&1; then
        print_status 0 "Nginx configuration valid"
    else
        print_status 1 "Nginx configuration has errors"
        nginx -t 2>&1
    fi
    
    if systemctl is-active nginx > /dev/null 2>&1; then
        print_status 0 "Nginx service running"
    else
        print_status 1 "Nginx service not running"
    fi
    
    # Check if cashflowtrends.ai site is enabled
    if [ -L "/etc/nginx/sites-enabled/cashflowtrends.ai" ]; then
        print_status 0 "Cashflowtrends.ai site enabled"
    else
        print_warning "Cashflowtrends.ai site may not be enabled"
    fi
else
    print_status 1 "Nginx not installed"
fi
echo ""

echo "7. 🔧 Database Connection Security"
echo "----------------------------------"
if [ -f "db.js" ]; then
    # Check if proper production SSL is configured
    if grep -q "rejectUnauthorized: true" db.js; then
        print_status 0 "Database SSL properly configured"
    else
        print_warning "Database SSL configuration may need review"
    fi
    
    # Test database connection
    if node -e "require('./db').testConnection().then(() => process.exit(0)).catch(() => process.exit(1))" 2>/dev/null; then
        print_status 0 "Database connection test passed"
    else
        print_status 1 "Database connection test failed"
    fi
else
    print_status 1 "db.js file not found"
fi
echo ""

echo "8. 🔑 OAuth Configuration"
echo "-------------------------"
if [ -f ".env" ]; then
    MYOB_REDIRECT=$(grep "MYOB_REDIRECT_URI" .env 2>/dev/null | cut -d'=' -f2)
    if [[ "$MYOB_REDIRECT" == https://cashflowtrends.ai* ]]; then
        print_status 0 "MYOB OAuth redirect URI uses HTTPS"
    else
        print_status 1 "MYOB OAuth redirect URI issue: $MYOB_REDIRECT"
    fi
    
    # Check if required OAuth vars are set
    for var in MYOB_CLIENT_ID MYOB_CLIENT_SECRET; do
        if grep -q "^$var=" .env 2>/dev/null; then
            print_status 0 "$var is set"
        else
            print_status 1 "$var not found in .env"
        fi
    done
else
    print_status 1 "Cannot check OAuth configuration (.env missing)"
fi
echo ""

echo "🎯 SUMMARY"
echo "=========="
if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL CHECKS PASSED! Ready for production deployment.${NC}"
        exit 0
    else
        echo -e "${YELLOW}✅ All critical checks passed, but there are $WARNINGS warnings to review.${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ $ERRORS critical issues found. DO NOT deploy to production until fixed.${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Also found $WARNINGS warnings to review.${NC}"
    fi
    echo ""
    echo -e "${BLUE}💡 Review PRODUCTION_HARDENING.md for solutions.${NC}"
    exit 1
fi 