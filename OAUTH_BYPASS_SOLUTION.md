# OAuth Bypass Solution

## Problem
The OAuth callback is receiving Ory authorization codes (`ory_ac_*`) instead of MYOB codes, indicating the browser is being redirected to the wrong OAuth provider.

## Temporary Bypass Solution

### Option 1: Manual Token Entry
Add this route to `routes/auth.js` to manually set a token:

```javascript
// Manual token entry for testing (REMOVE IN PRODUCTION)
router.post('/auth/manual-token', asyncHandler(async (req, res) => {
    const { access_token, refresh_token, expires_in } = req.body;
    
    if (!access_token || !refresh_token) {
        return res.status(400).json({ error: 'Missing access_token or refresh_token' });
    }
    
    const tokenData = {
        access_token,
        refresh_token,
        token_type: 'Bearer',
        expires_in: expires_in || 3600,
        expires_at: Date.now() + ((expires_in || 3600) * 1000)
    };
    
    await tokenStore.saveToken(tokenData);
    req.session.token = tokenData;
    req.session.isAuthenticated = true;
    
    res.json({ success: true, message: 'Token saved successfully' });
}));
```

### Option 2: Direct MYOB API Testing
Use this curl command to get a token directly from MYOB:

```bash
# Step 1: Get authorization code by visiting this URL in browser:
https://secure.myob.com/oauth2/account/authorize?client_id=3502423a-cfd5-40f8-b7c8-af12d72241a3&redirect_uri=https://cashflowtrends.ai/auth/callback&response_type=code&scope=offline_access%20openid&state=test

# Step 2: After login, copy the 'code' parameter from the redirect URL

# Step 3: Exchange code for token
curl -X POST https://secure.myob.com/oauth2/v1/authorize \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=3502423a-cfd5-40f8-b7c8-af12d72241a3" \
  -d "client_secret=51zxmK3RmZkGkR8lhOv1goS3" \
  -d "code=YOUR_CODE_HERE" \
  -d "redirect_uri=https://cashflowtrends.ai/auth/callback" \
  -d "grant_type=authorization_code"
```

### Option 3: Mock Token for Development
Add this to `routes/auth.js` for development only:

```javascript
// Development mock login (REMOVE IN PRODUCTION)
router.get('/auth/mock-login', asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: 'Only available in development' });
    }
    
    // Mock token data
    const mockToken = {
        access_token: 'mock_access_token_' + Date.now(),
        refresh_token: 'mock_refresh_token_' + Date.now(),
        token_type: 'Bearer',
        expires_in: 3600,
        expires_at: Date.now() + (3600 * 1000)
    };
    
    await tokenStore.saveToken(mockToken);
    req.session.token = mockToken;
    req.session.isAuthenticated = true;
    req.session.save((err) => {
        if (err) console.error('Session save error:', err);
        res.redirect('/public/company-selection.html');
    });
}));
```

## Debugging Steps

1. **Check DNS Resolution**:
   ```bash
   nslookup secure.myob.com
   # Should resolve to MYOB's servers, not Ory
   ```

2. **Test Direct API Call**:
   ```bash
   curl -I https://secure.myob.com/oauth2/account/authorize
   # Should return MYOB headers, not Ory
   ```

3. **Browser Network Tab**:
   - Open browser developer tools
   - Go to Network tab
   - Click "Login with MYOB"
   - Check if the request goes to secure.myob.com or gets redirected elsewhere

4. **Check for Intercepting Software**:
   - Disable browser extensions
   - Check for corporate proxies
   - Try from a different network
   - Use a different browser in incognito mode

## Root Cause Possibilities

1. **DNS Hijacking**: Your DNS might be resolving secure.myob.com to Ory's servers
2. **Proxy Interception**: A proxy might be intercepting OAuth flows
3. **Browser Extension**: An extension might be redirecting OAuth URLs
4. **MYOB Configuration**: The app might be misconfigured in MYOB's system

## Long-term Solution

Once you identify why the redirect is happening to Ory, fix the root cause. The bypass solutions above are only for testing and development. 