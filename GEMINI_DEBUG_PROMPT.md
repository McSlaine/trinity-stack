# MYOB OAuth Authentication Issue - Debug Request for Gemini

## URGENT: Getting 500 errors on OAuth callback

### Current Situation:
- App: Node.js/Express at https://cashflowtrends.ai
- Issue: OAuth callback returns "Authentication failed" after MYOB login
- MYOB now uses Ory for authentication (codes start with `ory_ac_`)
- Token exchange to MYOB is failing with 400 Bad Request

### Environment Setup:
```javascript
// Current credentials in PM2
MYOB_CLIENT_ID: 7e825f9a-2c09-4fd8-b00f-c585bbe904ca
MYOB_CLIENT_SECRET: 0NcMv4ofzqGEi2jcw8Lno0x1
MYOB_REDIRECT_URI: https://cashflowtrends.ai/auth/callback
```

### Current Code (routes/auth.js):
```javascript
// OAuth initiation
router.get('/auth/myob', (req, res) => {
    req.session.state = generateState();
    const authUrl = `https://secure.myob.com/oauth2/account/authorize?` +
        `client_id=${MYOB_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(MYOB_REDIRECT_URI)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('offline_access openid')}&` +
        `state=${req.session.state}`;
    res.redirect(authUrl);
});

// Token exchange (FAILING HERE)
router.get('/auth/callback', asyncHandler(async (req, res) => {
    const { code } = req.query;
    
    const postData = querystring.stringify({
        client_id: MYOB_CLIENT_ID,
        client_secret: MYOB_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: MYOB_REDIRECT_URI,
    });

    // Tries v2 endpoint first, then v1
    let tokenUrl = 'https://secure.myob.com/oauth2/v2/token';
    try {
        tokenResponse = await axios.post(tokenUrl, postData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
    } catch (v2Error) {
        // Fallback to v1
        tokenUrl = 'https://secure.myob.com/oauth2/v1/token';
        tokenResponse = await axios.post(tokenUrl, postData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
    }
}));
```

### What We Know:
1. MYOB recently switched to Ory for "Secure Invoicing" (October 2024)
2. Authorization codes now start with `ory_ac_` - this is EXPECTED
3. The OAuth flow redirects correctly and returns valid-looking codes
4. Token exchange fails with 400 Bad Request at both v1 and v2 endpoints

### The Question:
**How do we properly exchange Ory-issued authorization codes with MYOB's token endpoint?**

Possibilities to investigate:
1. Is there a new token endpoint for Ory-based auth?
2. Do we need different parameters for Ory codes?
3. Is there a required header or authentication method change?
4. Should we be using a different OAuth flow entirely?

### What We Need:
The correct way to complete MYOB OAuth authentication in 2024/2025 with their new Ory-based system. We have valid client credentials and the OAuth flow starts correctly, but the token exchange is failing.

Please provide the working solution or identify what's wrong with our current implementation. 