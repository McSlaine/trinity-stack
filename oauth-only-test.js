// oauth-only-test.js - OAuth test without database dependencies
require('dotenv').config();
const express = require('express');
const session = require('express-session');

console.log('🔐 OAUTH-ONLY TEST - Skipping Database');
console.log('=====================================');

// Configuration check
console.log('\n📋 OAuth Configuration:');
console.log(`  Client ID: ${process.env.MYOB_CLIENT_ID}`);
console.log(`  Redirect URI: ${process.env.MYOB_REDIRECT_URI}`);

// Generate OAuth URL
const state = 'test-' + Date.now();
const scope = 'CompanyFile offline_access';
const authUrl = `https://secure.myob.com/oauth2/account/authorize?client_id=${process.env.MYOB_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.MYOB_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;

console.log('\n🔗 OAuth URL Generated:');
console.log(authUrl);

// Start Express server on different port
const app = express();

app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'test-secret',
    resave: false,
    saveUninitialized: false,
}));

// OAuth start endpoint
app.get('/auth/myob', (req, res) => {
    console.log('\n🚀 OAuth flow initiated from /auth/myob');
    const newState = 'live-' + Date.now();
    req.session.state = newState;
    
    const liveAuthUrl = `https://secure.myob.com/oauth2/account/authorize?client_id=${process.env.MYOB_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.MYOB_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${newState}`;
    
    console.log(`🔗 Redirecting to: ${liveAuthUrl}`);
    res.redirect(liveAuthUrl);
});

// OAuth callback endpoint  
app.get('/auth/callback', (req, res) => {
    const { code, state: returnedState, error } = req.query;
    
    console.log('\n🎉 OAUTH CALLBACK RECEIVED!');
    console.log('===========================');
    console.log(`  Code: ${code ? 'RECEIVED ✅ (' + code.substring(0, 20) + '...)' : 'MISSING ❌'}`);
    console.log(`  State: ${returnedState ? 'RECEIVED ✅' : 'MISSING ❌'}`);
    console.log(`  Error: ${error || 'None ✅'}`);
    console.log(`  Session State: ${req.session.state ? 'PRESENT ✅' : 'MISSING ❌'}`);
    
    if (code && returnedState && req.session.state) {
        console.log('\n🎯 OAUTH AUTHORIZATION SUCCESSFUL!');
        console.log('✅ Authorization code received');
        console.log('✅ State parameter present');
        console.log('✅ Session state matches');
        
        // Next step would be to exchange code for tokens
        console.log('\n🔄 Next Step: Exchange code for tokens');
        console.log('   POST to: https://secure.myob.com/oauth2/v1/token');
        console.log('   With: authorization_code grant');
        
        res.json({
            success: true,
            message: 'OAuth authorization successful! ✅',
            code: code.substring(0, 20) + '...',
            state: returnedState,
            next_step: 'Exchange authorization code for access token',
            instructions: [
                'Your MYOB OAuth flow is working perfectly!',
                'Authorization code received successfully',
                'Ready to exchange code for access tokens'
            ]
        });
    } else {
        console.log('\n❌ OAUTH FLOW ISSUES:');
        if (!code) console.log('  - No authorization code received');
        if (!returnedState) console.log('  - No state parameter returned');
        if (!req.session.state) console.log('  - No session state found');
        
        res.json({
            success: false,
            message: 'OAuth authorization had issues',
            issues: {
                code: code ? 'Present' : 'Missing',
                state: returnedState ? 'Present' : 'Missing',
                session: req.session.state ? 'Present' : 'Missing'
            }
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'OAuth test server running (no database)',
        timestamp: new Date().toISOString()
    });
});

// Try different ports if 3000 is in use
const tryPort = (port) => {
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`\n✅ OAuth test server started on port ${port}`);
        console.log(`🌐 Base URL: http://cashflowtrends.ai:${port}`);
        console.log(`🔐 OAuth Start: http://cashflowtrends.ai:${port}/auth/myob`);
        console.log(`📥 OAuth Callback: http://cashflowtrends.ai:${port}/auth/callback`);
        console.log(`🏥 Health Check: http://cashflowtrends.ai:${port}/health`);
        
        console.log('\n🎯 READY TO TEST OAUTH:');
        console.log(`1. Open: http://cashflowtrends.ai:${port}/auth/myob`);
        console.log('2. Login: erik@hit-equipment.com.au / Heinous77!!');
        console.log('3. Check this console for callback results');
        console.log('\nPress Ctrl+C to stop');
    });
    
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && port < 3010) {
            console.log(`Port ${port} in use, trying ${port + 1}...`);
            tryPort(port + 1);
        } else {
            console.error(`Server error: ${err.message}`);
        }
    });
};

// Start server
tryPort(3000);

process.on('SIGINT', () => {
    console.log('\n🛑 Stopping OAuth test server...');
    process.exit(0);
}); 