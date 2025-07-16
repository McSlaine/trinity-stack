const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const tokenStore = require('../tokenStore');
const asyncHandler = require('../middleware/asyncHandler');
const Joi = require('joi');
const crypto = require('crypto');

const router = express.Router();

const MYOB_CLIENT_ID = process.env.MYOB_CLIENT_ID ? process.env.MYOB_CLIENT_ID.trim() : '';
const MYOB_CLIENT_SECRET = process.env.MYOB_CLIENT_SECRET ? process.env.MYOB_CLIENT_SECRET.trim() : '';
const MYOB_REDIRECT_URI = process.env.MYOB_REDIRECT_URI ? process.env.MYOB_REDIRECT_URI.trim() : '';
const AUTH_URL = 'https://secure.myob.com/oauth2/account/authorize';

// Login page
router.get('/auth/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Login - Cashflow Trends AI</title>
            <style>
                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
                .login-container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
                h1 { color: #333; margin-bottom: 20px; }
                .login-btn { background: #0066cc; color: white; padding: 12px 30px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; }
                .login-btn:hover { background: #0052a3; }
            </style>
        </head>
        <body>
            <div class="login-container">
                <h1>Cashflow Trends AI</h1>
                <p>Connect your MYOB account to get started</p>
                <a href="/auth/myob" class="login-btn">Login with MYOB</a>
            </div>
        </body>
        </html>
    `);
});

// Diagnostic endpoint to check OAuth URL
router.get('/auth/check-oauth-url', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    const scope = encodeURIComponent('offline_access openid');
    const authUrl = `${AUTH_URL}?client_id=${MYOB_CLIENT_ID}&redirect_uri=${MYOB_REDIRECT_URI}&response_type=code&scope=${scope}&state=${state}`;
    
    res.json({
        message: 'OAuth URL Configuration',
        AUTH_URL: AUTH_URL,
        MYOB_CLIENT_ID: MYOB_CLIENT_ID,
        MYOB_REDIRECT_URI: MYOB_REDIRECT_URI,
        generatedUrl: authUrl,
        expectedDomain: 'secure.myob.com',
        issue: 'If you are being redirected to Ory, check DNS resolution or browser extensions'
    });
});

// Diagnostic endpoint to check session
router.get('/auth/session-check', (req, res) => {
    res.json({
        sessionID: req.sessionID,
        session: req.session,
        cookies: req.cookies,
        headers: {
            host: req.headers.host,
            origin: req.headers.origin,
            referer: req.headers.referer,
            cookie: req.headers.cookie ? 'present' : 'missing'
        },
        secure: req.secure,
        protocol: req.protocol,
        environment: process.env.NODE_ENV
    });
});

// Redirect user to MYOB for authentication
router.get('/auth/myob', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.state = state;
    
    console.log('Setting OAuth state:', {
        state: state,
        sessionID: req.sessionID,
        sessionExists: !!req.session,
        secure: req.secure,
        protocol: req.protocol,
        host: req.headers.host
    });
    
    const scope = encodeURIComponent('offline_access openid');
    const authUrl = `${AUTH_URL}?client_id=${MYOB_CLIENT_ID}&redirect_uri=${MYOB_REDIRECT_URI}&response_type=code&scope=${scope}&state=${state}`;
    
    console.log('=== MYOB OAuth Debug ===');
    console.log('MYOB Client ID:', MYOB_CLIENT_ID);
    console.log('MYOB Client ID length:', MYOB_CLIENT_ID.length);
    console.log('MYOB Redirect URI:', MYOB_REDIRECT_URI);
    console.log('Full OAuth URL:', authUrl);
    console.log('========================');
    
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

// Temporary bypass for development - REMOVE IN PRODUCTION
router.get('/auth/bypass-login', asyncHandler(async (req, res) => {
    console.log('WARNING: Using bypass login - DEVELOPMENT ONLY');
    
    // Create a mock token
    const mockToken = {
        access_token: 'dev_access_token_' + Date.now(),
        refresh_token: 'dev_refresh_token_' + Date.now(),
        token_type: 'Bearer',
        expires_in: 3600,
        expires_at: Date.now() + (3600 * 1000),
        scope: 'CompanyFile'
    };
    
    // Store the mock token
    await tokenStore.saveToken(mockToken);
    
    // Set session
    req.session.token = mockToken;
    req.session.isAuthenticated = true;
    
    // Save session and redirect
    req.session.save((err) => {
        if (err) console.error('Session save error:', err);
        res.redirect('/public/company-selection.html');
    });
}));

// Logout endpoint
router.get('/auth/logout', (req, res) => {
    console.log('User logging out');
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.clearCookie('connect.sid');
        res.redirect('/auth/login');
    });
});

// Handle callback at root path (for old MYOB app compatibility)
router.get('/callback', (req, res) => {
    console.log('Redirecting from /callback to /auth/callback');
    const queryString = req.originalUrl.split('?')[1];
    res.redirect(`/auth/callback?${queryString}`);
});

// Handle the callback from MYOB
router.get('/auth/callback', asyncHandler(async (req, res) => {
    console.log('OAuth callback received:', {
        code: req.query.code?.substring(0, 20) + '...',
        state: req.query.state,
        sessionState: req.session.state
    });

    if (req.query.state !== req.session.state) {
        return res.status(400).send('Invalid state parameter');
    }

    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Authorization code missing');
    }

    // Check if this is an Ory code (temporary workaround)
    if (code.startsWith('ory_ac_')) {
        console.error('WARNING: Received Ory authorization code instead of MYOB code');
        console.error('This indicates the OAuth flow is being intercepted or misconfigured');
        
        // Log the full details for debugging
        console.log('Full callback details:', {
            code: code,
            state: req.query.state,
            scope: req.query.scope,
            headers: req.headers
        });
    }

    const postData = querystring.stringify({
        client_id: MYOB_CLIENT_ID,
        client_secret: MYOB_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: MYOB_REDIRECT_URI,
    });

    console.log('Attempting token exchange with:', {
        url: 'https://secure.myob.com/oauth2/v1/token',
        client_id: MYOB_CLIENT_ID,
        redirect_uri: MYOB_REDIRECT_URI,
        code_prefix: code.substring(0, 10) + '...'
    });

    try {
        // Try the v2 endpoint first (might be the new endpoint for Ory-based auth)
        let tokenUrl = 'https://secure.myob.com/oauth2/v2/token';
        
        console.log('Attempting token exchange at:', tokenUrl);
        
        let tokenResponse;
        try {
            tokenResponse = await axios.post(tokenUrl, postData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
        } catch (v2Error) {
            console.error('V2 endpoint failed, trying V1:', v2Error.response?.status);
            // Fallback to v1 endpoint
            tokenUrl = 'https://secure.myob.com/oauth2/v1/token';
            tokenResponse = await axios.post(tokenUrl, postData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
        }

        console.log('Token exchange successful!');

        // Store token in tokenStore
        await tokenStore.storeToken(tokenResponse.data);
        
        // Set session flag to indicate user is authenticated
        req.session.token = true;
        req.session.save((err) => {
            if (err) console.error('Session save error:', err);
            res.redirect('/public/company-selection.html');
        });
    } catch (error) {
        console.error('OAuth callback error:', error.message);
        console.error('Full error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            headers: error.response?.headers,
            config: {
                url: error.config?.url,
                method: error.config?.method,
                data: error.config?.data
            }
        });
        
        // Check if it's an invalid_grant error (common with wrong credentials)
        if (error.response?.data?.error === 'invalid_grant') {
            console.error('Invalid grant - this usually means:');
            console.error('1. The authorization code has expired');
            console.error('2. The code has already been used');
            console.error('3. The redirect_uri does not match exactly');
            console.error('4. The client credentials are wrong');
        }
        
        // Check if this is an Ory intercepted request
        if (code.startsWith('ory_ac_')) {
            return res.status(500).send(`
                <h1>OAuth Flow Intercepted by Ory</h1>
                <p>The authorization code starts with "ory_ac_" which indicates your OAuth flow is being intercepted by Ory instead of going to MYOB.</p>
                <h2>Possible causes:</h2>
                <ul>
                    <li>Browser extension (like Ory Session Manager)</li>
                    <li>Local proxy or VPN intercepting requests</li>
                    <li>DNS resolution issues</li>
                    <li>Hosts file entries redirecting secure.myob.com</li>
                </ul>
                <h2>To fix:</h2>
                <ol>
                    <li>Disable all browser extensions and try again</li>
                    <li>Try in an incognito/private browser window</li>
                    <li>Check your hosts file for any MYOB entries</li>
                    <li>Disable any local proxies or VPNs</li>
                </ol>
                <p><a href="/auth/login">Try logging in again</a></p>
            `);
        }
        
        return res.status(500).send('Authentication failed. Check server logs for details.');
    }
}));

router.post('/refresh-token', asyncHandler(async (req, res, next) => {
    const tokenData = await tokenStore.getToken();
    if (!tokenData || !tokenData.refresh_token) {
        return res.status(400).json({ error: 'No refresh token available.' });
    }

    const postData = querystring.stringify({
        client_id: MYOB_CLIENT_ID,
        client_secret: MYOB_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
    });

    try {
        const tokenResponse = await axios.post('https://secure.myob.com/oauth2/v1/token', postData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        await tokenStore.storeToken(tokenResponse.data);
        res.json({ message: 'Token refreshed successfully.' });
    } catch (error) {
        console.error('Token refresh failed:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to refresh token.' });
    }
}));

router.post('/auth/select-company', asyncHandler(async (req, res) => {
    // Accept both companyId and historicalYears
    const schema = Joi.object({ 
        companyId: Joi.string().required(),
        historicalYears: Joi.string().optional() 
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { companyId, historicalYears } = req.body;
    if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required.' });
    }

    // Check session authentication
    if (!req.session || !req.session.token) {
        return res.status(401).json({ error: 'Session authentication required.' });
    }

    try {
        // Get the current token
        const tokenData = await tokenStore.getToken();
        if (!tokenData || !tokenData.access_token) {
            return res.status(401).json({ error: 'No valid access token found. Please re-authenticate.' });
        }

        // Fetch company files from MYOB to verify the selected company exists
        const { makeMyobApiRequest } = require('../lib/myob');
        const companyFiles = await makeMyobApiRequest('https://api.myob.com/accountright/');
        
        const selectedCompany = companyFiles.find(cf => cf.Id === companyId);
        if (!selectedCompany) {
            return res.status(404).json({ error: 'Company file not found.' });
        }

        // Store company selection in session
        req.session.selectedCompany = {
            id: selectedCompany.Id,
            name: selectedCompany.Name,
            uri: selectedCompany.Uri,
            historicalYears: historicalYears || '2' // Default to 2 years
        };

        // Store company info in database for future reference
        const { query } = require('../db');
        await query(
            'INSERT INTO company_files (myob_uid, name, uri, country) VALUES ($1, $2, $3, $4) ON CONFLICT (myob_uid) DO UPDATE SET name = $2, uri = $3, country = $4',
            [selectedCompany.Id, selectedCompany.Name, selectedCompany.Uri, selectedCompany.Country || 'AU']
        );

        // Save session and redirect to company dashboard
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ error: 'Failed to save session.' });
            }
            res.json({ 
                success: true, 
                redirect: `/public/company-file.html?id=${companyId}`,
                company: selectedCompany.Name
            });
        });
    } catch (error) {
        console.error('Company selection error:', error);
        res.status(500).json({ 
            error: 'Failed to select company file',
            details: error.message 
        });
    }
}));

// Re-authenticate endpoint (keeps session but gets new MYOB token)
router.get('/auth/reauth', (req, res) => {
    if (!req.session || !req.session.token) {
        return res.redirect('/auth/login');
    }
    // Redirect to MYOB auth while keeping session
    res.redirect('/auth/myob');
});

// Logout endpoint
router.get('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
        res.redirect('/auth/login');
    });
});

module.exports = router;