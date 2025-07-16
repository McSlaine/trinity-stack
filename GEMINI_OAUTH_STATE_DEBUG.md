# OAuth State Parameter Error - Debugging Request for Gemini

## Problem Summary
Getting "Invalid state parameter" error during MYOB OAuth callback at:
https://cashflowtrends.ai/auth/callback?code=ory_ac_tQZjtSyAY3h7ThLRcAK6rfONEL8yNu7MHX4rIoDamGg.UvzWURjaf_arRRvqr1LZiHaeo1zbzDuRnjORTJcCSqo&scope=offline_access+openid&state=b69e3dfd9377d473db89ea357d20954f

## Current Setup

### 1. Session Configuration (server.js)
```javascript
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'your-session-secret-here-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined
  }
}));
```

### 2. OAuth Flow (routes/auth.js)
```javascript
// Initial OAuth redirect
router.get('/auth/myob', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.state = state;
    
    // Force session save before redirect
    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
            return res.status(500).send('Session error');
        }
        console.log('Session saved successfully before redirect');
        res.redirect(authUrl);
    });
});

// OAuth callback
router.get('/auth/callback', asyncHandler(async (req, res) => {
    if (req.query.state !== req.session.state) {
        return res.status(400).send('Invalid state parameter');
    }
    // ... rest of callback logic
}));
```

### 3. Infrastructure Details
- **PM2 Cluster Mode**: Running 2 instances
- **Redis**: Local Redis instance at redis://localhost:6379
- **NODE_ENV**: production
- **HTTPS**: Yes, behind nginx proxy
- **Cookie Domain**: Not explicitly set (using default)

### 4. Observed Behavior
1. User clicks login, gets redirected to MYOB OAuth
2. State is generated and saved to session
3. User completes OAuth at MYOB
4. MYOB redirects back with state parameter
5. State in callback doesn't match session state
6. Error: "Invalid state parameter"

## Potential Issues to Investigate

1. **Session Not Persisting Between Requests**
   - Is Redis properly storing sessions?
   - Are cookies being set correctly?
   - Is the session ID changing between requests?

2. **PM2 Cluster Mode Issues**
   - Are both instances sharing the same Redis store?
   - Is sticky session needed?

3. **Cookie Configuration**
   - Is `secure: true` causing issues?
   - Should we set explicit cookie domain?
   - Is sameSite='lax' blocking the cookie?

4. **HTTPS/Proxy Issues**
   - Is nginx preserving headers correctly?
   - Is the app seeing the correct protocol?

5. **State Overwriting**
   - Multiple login attempts overwriting state?
   - Race condition in cluster mode?

## Debug Commands to Run
```bash
# Check Redis sessions
redis-cli keys "*sess*"

# Monitor Redis in real-time
redis-cli monitor

# Check PM2 logs
pm2 logs cashflow-ai --lines 100

# Test session persistence
curl -c cookies.txt https://cashflowtrends.ai/auth/session-check
curl -b cookies.txt https://cashflowtrends.ai/auth/session-check
```

## Questions for Analysis
1. Why is the OAuth code prefixed with "ory_ac_" instead of being a MYOB code?
2. Is the session being created but not retrieved on callback?
3. Should we implement sticky sessions in nginx for PM2 cluster mode?
4. Is the cookie being set with the correct domain/path?

## Proposed Solutions to Try

### Solution 1: Add Sticky Sessions in Nginx
```nginx
upstream node_app {
    ip_hash;  # Enable sticky sessions
    server 127.0.0.1:3000;
    keepalive 32;
}
```

### Solution 2: Explicit Cookie Domain
```javascript
cookie: {
    domain: '.cashflowtrends.ai',  // Allow subdomains
    // ... other settings
}
```

### Solution 3: Debug Session Middleware
```javascript
app.use((req, res, next) => {
    console.log('Session Debug:', {
        sessionID: req.sessionID,
        hasSession: !!req.session,
        sessionData: req.session,
        cookies: req.headers.cookie
    });
    next();
});
```

### Solution 4: Use Memory Store Temporarily
```javascript
// Temporarily disable Redis to test if it's the issue
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    // Remove Redis store temporarily
}));
```

Please analyze this issue and suggest the most likely cause and solution. The "ory_ac_" prefix in the OAuth code is particularly concerning as it suggests the request might be going through Ory instead of MYOB.

## CRITICAL FINDING - Diagnostic Results

I ran the session check endpoint and found the root cause:

```json
{
  "sessionID": "zagQWisj-yw4_QyfibiSwu5m4cuPej4M",
  "session": {
    "cookie": {
      "secure": true,      // Cookie requires HTTPS
      "httpOnly": true,
      "sameSite": "lax"
    }
  },
  "headers": {
    "cookie": "missing"    // No cookie being sent!
  },
  "secure": false,         // App thinks it's HTTP
  "protocol": "http",      // App thinks it's HTTP
  "environment": "production"
}
```

**THE ISSUE**: The app is setting `secure: true` cookies (because NODE_ENV=production) but the Express app thinks it's running on HTTP (not HTTPS) because it's behind an nginx proxy. This means:
1. Browser receives secure cookie over HTTPS
2. Browser won't send secure cookie back because app responds with HTTP
3. No cookie = no session = state mismatch

## IMMEDIATE FIX NEEDED

Add this to server.js BEFORE session middleware:

```javascript
// Trust proxy - CRITICAL for apps behind nginx
app.set('trust proxy', 1);
```

This tells Express to trust the X-Forwarded-Proto header from nginx, so it knows the real protocol is HTTPS.

Alternative fixes if that doesn't work:
1. Set `cookie.secure = false` temporarily
2. Or check for proxy headers manually 