# GEMINI PRODUCTION TASK: Fix Authentication for Customer Platform

## PRIORITY: CRITICAL - Customer Platform Production Issue

### PROBLEM SUMMARY:
Console shows two critical failures:
1. `POST /auth/select-company 404 (Not Found)` - Missing endpoint
2. `GET /api/company/files 401 (Unauthorized)` - Session auth failing

### CUSTOMER PLATFORM REQUIREMENTS:
- This is NOT a personal tool, it's a customer-facing financial analysis platform
- No workarounds or bypasses acceptable in production
- Must have proper session persistence and security
- OAuth flow must complete properly for real MYOB integration

---

## TASK 1: CREATE MISSING `/auth/select-company` ENDPOINT

**File:** `routes/auth.js`
**Method:** POST
**Purpose:** Handle company selection after OAuth login

### Implementation Requirements:
```javascript
// Add to routes/auth.js
router.post('/auth/select-company', asyncHandler(async (req, res) => {
    const { companyId } = req.body;
    
    // Validate session is authenticated
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Validate company ID
    if (!companyId) {
        return res.status(400).json({ error: 'Company ID required' });
    }
    
    // Store selected company in session
    req.session.selectedCompanyId = companyId;
    
    // Save session explicitly
    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ error: 'Session save failed' });
        }
        
        // Return success with redirect URL
        res.json({ 
            success: true, 
            redirectUrl: `/company-file.html?id=${companyId}` 
        });
    });
}));
```

---

## TASK 2: FIX SESSION PERSISTENCE ISSUE

**Problem:** Session set in OAuth callback but not available in subsequent API calls

### Root Cause Analysis:
- OAuth callback sets `req.session.isAuthenticated = true`
- OAuth callback sets `req.session.token = mockToken`
- Session is saved with `req.session.save()`
- But subsequent `/api/company/files` request shows session as undefined

### Investigation Required:
1. Check if session cookies are being set properly
2. Verify session middleware configuration in server.js
3. Ensure session secret is properly configured
4. Check for cookie domain/path issues

### Fix Implementation:
```javascript
// In routes/auth.js OAuth callback - enhance session setting
req.session.isAuthenticated = true;
req.session.token = mockToken;
req.session.userId = 'oauth_user_' + Date.now(); // Add user identifier
req.session.authenticatedAt = new Date().toISOString();

// Force session regeneration for security
req.session.regenerate((err) => {
    if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).send('Session error');
    }
    
    // Set session values after regeneration
    req.session.isAuthenticated = true;
    req.session.token = mockToken;
    req.session.userId = 'oauth_user_' + Date.now();
    
    req.session.save((saveErr) => {
        if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.status(500).send('Failed to save session.');
        }
        console.log('✅ Session saved successfully with ID:', req.sessionID);
        res.redirect('/company-selection.html?oauth_bypass=true');
    });
});
```

---

## TASK 3: ENHANCE SESSION DEBUGGING

**File:** `middleware/sessionAuth.js`

### Add Production-Grade Session Debugging:
```javascript
function requireSessionAuth(req, res, next) {
    console.log('🔍 Session Debug:', {
        sessionID: req.sessionID,
        hasSession: !!req.session,
        sessionKeys: req.session ? Object.keys(req.session) : [],
        isAuthenticated: req.session?.isAuthenticated,
        hasToken: !!(req.session?.token),
        tokenType: req.session?.token?.access_token?.substring(0, 10),
        cookies: req.headers.cookie ? 'present' : 'missing',
        userAgent: req.headers['user-agent']?.substring(0, 50)
    });
    
    if (!req.session?.token) {
        console.log('❌ SessionAuth FAILED - session data:', req.session);
        return res.status(401).json({ 
            error: 'Authentication required. Please log in first.',
            debug: process.env.NODE_ENV === 'development' ? {
                sessionID: req.sessionID,
                hasSession: !!req.session
            } : undefined
        });
    }
    
    console.log('✅ SessionAuth PASSED for session:', req.sessionID);
    next();
}
```

---

## TASK 4: PRODUCTION SESSION CONFIGURATION

**File:** `server.js`

### Enhance Session Configuration for Production:
```javascript
// Production-grade session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiry on each request
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS in production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        sameSite: 'lax' // CSRF protection
    },
    name: 'cashflow.sid',
    // Add session store for production
    store: process.env.NODE_ENV === 'production' ? 
        new (require('connect-redis')(session))({
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT
        }) : undefined
}));
```

---

## TASK 5: TESTING REQUIREMENTS

### Test OAuth Flow:
1. Visit `/auth/login`
2. Complete MYOB OAuth (will get Ory intercepted code)
3. Verify session persists through company selection
4. Verify `/auth/select-company` endpoint works
5. Verify session remains valid for `/api/company/files`

### Success Criteria:
- ✅ No 404 errors on company selection
- ✅ No 401 errors on API calls after OAuth
- ✅ Session persists across page reloads
- ✅ Proper production-grade security

---

## IMPLEMENTATION PRIORITY:
1. **URGENT:** Create `/auth/select-company` endpoint (fixes 404)
2. **CRITICAL:** Fix session persistence (fixes 401s)  
3. **IMPORTANT:** Add production session debugging
4. **MEDIUM:** Enhance session configuration

---

**DEADLINE:** Fix immediately for customer platform readiness
**TESTING:** Must work with real customer OAuth flows 