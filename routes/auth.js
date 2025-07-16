const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const tokenStore = require('../tokenStore');
const asyncHandler = require('../middleware/asyncHandler');
const Joi = require('joi');
const crypto = require('crypto');

const router = express.Router();

const MYOB_CLIENT_ID = process.env.MYOB_CLIENT_ID.trim();
const { MYOB_CLIENT_SECRET, MYOB_REDIRECT_URI } = process.env;
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

// Redirect user to MYOB for authentication
router.get('/auth/myob', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.state = state;
    const scope = encodeURIComponent('offline_access openid');
    const authUrl = `${AUTH_URL}?client_id=${MYOB_CLIENT_ID}&redirect_uri=${MYOB_REDIRECT_URI}&response_type=code&scope=${scope}&state=${state}`;
    console.log('Redirecting to MYOB OAuth URL:', authUrl);
    console.log('MYOB Client ID:', MYOB_CLIENT_ID);
    res.redirect(authUrl);
});

// Handle the callback from MYOB
router.get('/auth/callback', asyncHandler(async (req, res) => {
    if (req.query.state !== req.session.state) {
        return res.status(400).send('Invalid state parameter');
    }

    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Authorization code missing');
    }

    const postData = querystring.stringify({
        client_id: MYOB_CLIENT_ID,
        client_secret: MYOB_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: MYOB_REDIRECT_URI,
    });

    try {
        const tokenResponse = await axios.post('https://secure.myob.com/oauth2/v1/token', postData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        // Store token in tokenStore
        await tokenStore.storeToken(tokenResponse.data);
        
        // Set session flag to indicate user is authenticated
        req.session.token = true;
        req.session.save((err) => {
            if (err) console.error('Session save error:', err);
            res.redirect('/public/company-selection.html');
        });
    } catch (error) {
        console.error('OAuth callback error:', error.response?.data || error.message);
        console.error('Full error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            code: code,
            postData: postData
        });
        res.status(500).send('Authentication failed. Please try again.');
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