# MYOB OAuth Setup Guide

## The Problem

You're currently experiencing an OAuth authentication issue where:
1. Your app attempts to authenticate with MYOB
2. MYOB rejects your client ID with a 400 Bad Request error
3. You're somehow redirected to Ory's OAuth service
4. You receive Ory tokens (`ory_at_`, `ory_rt_`, `ory_ac_`) instead of MYOB tokens
5. These Ory tokens can't be used with MYOB's API

## Why This Happens

The client ID `3502423a-cfd5-40f8-b7c8-af12d72241a3` is not a valid MYOB OAuth client ID. When MYOB rejects it, you're being redirected to an alternative authentication service (Ory).

Ory is an OAuth/OpenID Connect provider that uses specific token prefixes for security:
- `ory_at_`: OAuth 2.0 Access Token
- `ory_rt_`: OAuth 2.0 Refresh Token  
- `ory_ac_`: OAuth 2.0 Authorization Code

## Solution: Register with MYOB

### Step 1: Create MYOB Developer Account

1. Visit [MYOB Developer Portal](https://developer.myob.com/)
2. Sign up or log in with your MYOB account
3. Navigate to "My Apps" or "Applications"

### Step 2: Register Your Application

1. Click "Register a new app" or similar
2. Fill in the application details:
   - **App Name**: Cashflow Trends AI
   - **Description**: AI-powered cashflow analysis for MYOB data
   - **Redirect URI**: `https://cashflowtrends.ai/auth/callback`
   - **Scopes**: Select all financial data access scopes you need

3. After registration, you'll receive:
   - **Client ID**: A valid MYOB client ID (different format than the invalid one)
   - **Client Secret**: Keep this secure!

### Step 3: Update Your Application

Run the provided script:
```bash
./update-myob-creds.sh
```

Or manually update your `.env` file:
```env
MYOB_CLIENT_ID=your_new_client_id_from_myob
MYOB_CLIENT_SECRET=your_client_secret_from_myob
MYOB_REDIRECT_URI=https://cashflowtrends.ai/auth/callback
```

### Step 4: Restart and Test

```bash
pm2 restart cashflow-ai
```

Then visit https://cashflowtrends.ai/ and click "Connect to MYOB" - you should now be redirected to the actual MYOB login page.

## Troubleshooting

### Still Getting Ory Tokens?

1. **Clear browser cache/cookies** - Old session data might be interfering
2. **Check browser extensions** - Some security/proxy extensions intercept OAuth flows
3. **Try incognito mode** - This eliminates extension interference

### Getting 400 Bad Request?

- Double-check your client ID is copied correctly from MYOB
- Ensure the redirect URI in MYOB matches exactly: `https://cashflowtrends.ai/auth/callback`
- Verify your MYOB app is activated/approved

### Need to Find Your MYOB App Settings?

1. Log into [MYOB Developer Portal](https://developer.myob.com/)
2. Go to "My Apps"
3. Click on your app name
4. You can view/update settings and get your credentials here

## Additional Resources

- [MYOB API Documentation](https://developer.myob.com/api/accountright/v2/)
- [MYOB OAuth 2.0 Guide](https://developer.myob.com/api/accountright/api-overview/authentication/) 