#!/bin/bash

echo "=== MYOB Redirect URI Fix Script ==="
echo ""
echo "This script will help you update the redirect URI to match what's registered in MYOB."
echo ""

# Check current setting
echo "Current redirect URI in .env:"
grep MYOB_REDIRECT_URI .env 2>/dev/null || echo "Not found in .env"
echo ""

echo "What redirect URI is registered in your MYOB app?"
echo "Common options:"
echo "1) https://cashflowtrends.ai/auth/callback"
echo "2) http://cashflowtrends.ai/auth/callback"
echo "3) https://170.64.187.70/auth/callback"
echo "4) http://170.64.187.70/auth/callback"
echo "5) http://localhost:3000/auth/callback"
echo "6) Custom (enter your own)"
echo ""
read -p "Enter option (1-6): " choice

case $choice in
    1) NEW_URI="https://cashflowtrends.ai/auth/callback";;
    2) NEW_URI="http://cashflowtrends.ai/auth/callback";;
    3) NEW_URI="https://170.64.187.70/auth/callback";;
    4) NEW_URI="http://170.64.187.70/auth/callback";;
    5) NEW_URI="http://localhost:3000/auth/callback";;
    6) read -p "Enter custom redirect URI: " NEW_URI;;
    *) echo "Invalid option"; exit 1;;
esac

echo ""
echo "Updating redirect URI to: $NEW_URI"

# Backup .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update or add MYOB_REDIRECT_URI
if grep -q "MYOB_REDIRECT_URI=" .env; then
    # Update existing
    sed -i "s|MYOB_REDIRECT_URI=.*|MYOB_REDIRECT_URI=$NEW_URI|" .env
else
    # Add new
    echo "MYOB_REDIRECT_URI=$NEW_URI" >> .env
fi

echo "Updated .env file"
echo ""
echo "Restarting application..."
pm2 restart cashflow-ai

echo ""
echo "Done! The redirect URI has been updated to: $NEW_URI"
echo ""
echo "Now try logging in again at: https://cashflowtrends.ai/auth/login" 