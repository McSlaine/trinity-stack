#!/bin/bash

echo "MYOB OAuth Credential Update Script"
echo "==================================="
echo ""
echo "This script will help you update your MYOB OAuth credentials."
echo "You need to register your app at: https://developer.myob.com/"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    touch .env
fi

# Prompt for credentials
read -p "Enter your MYOB Client ID: " CLIENT_ID
read -p "Enter your MYOB Client Secret: " CLIENT_SECRET

# Update or add MYOB credentials
if grep -q "MYOB_CLIENT_ID" .env; then
    # Update existing
    sed -i "s/MYOB_CLIENT_ID=.*/MYOB_CLIENT_ID=$CLIENT_ID/" .env
else
    # Add new
    echo "MYOB_CLIENT_ID=$CLIENT_ID" >> .env
fi

if grep -q "MYOB_CLIENT_SECRET" .env; then
    # Update existing
    sed -i "s/MYOB_CLIENT_SECRET=.*/MYOB_CLIENT_SECRET=$CLIENT_SECRET/" .env
else
    # Add new
    echo "MYOB_CLIENT_SECRET=$CLIENT_SECRET" >> .env
fi

# Ensure redirect URI is set
if ! grep -q "MYOB_REDIRECT_URI" .env; then
    echo "MYOB_REDIRECT_URI=https://cashflowtrends.ai/auth/callback" >> .env
fi

echo ""
echo "✅ MYOB credentials updated in .env file"
echo ""
echo "Next steps:"
echo "1. Run: pm2 restart cashflow-ai"
echo "2. Visit: https://cashflowtrends.ai/"
echo "3. Click 'Connect to MYOB' to authenticate with your new credentials" 