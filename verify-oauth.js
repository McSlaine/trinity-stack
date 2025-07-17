// verify-oauth.js - Verify MYOB OAuth configuration and test actual flow
require('dotenv').config();
const axios = require('axios');

async function verifyOAuth() {
    console.log('🔐 MYOB OAUTH VERIFICATION');
    console.log('=========================');
    
    // Check environment variables
    console.log('\n📋 Configuration Check:');
    console.log(`  Client ID: ${process.env.MYOB_CLIENT_ID}`);
    console.log(`  Client Secret: ${process.env.MYOB_CLIENT_SECRET ? 'SET' : 'MISSING'}`);
    console.log(`  Redirect URI: ${process.env.MYOB_REDIRECT_URI}`);
    
    // Generate OAuth URL
    const state = 'test-' + Date.now();
    const scope = 'CompanyFile offline_access';
    const authUrl = `https://secure.myob.com/oauth2/account/authorize?client_id=${process.env.MYOB_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.MYOB_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
    
    console.log('\n🔗 Generated OAuth URL:');
    console.log(authUrl);
    
    // Test MYOB endpoint availability
    console.log('\n🌐 Testing MYOB OAuth Endpoint:');
    try {
        const response = await axios.get('https://secure.myob.com/oauth2/account/authorize', {
            params: {
                client_id: process.env.MYOB_CLIENT_ID,
                redirect_uri: process.env.MYOB_REDIRECT_URI,
                response_type: 'code',
                scope: scope,
                state: state
            },
            timeout: 10000,
            maxRedirects: 0,
            validateStatus: function (status) {
                return status < 400; // Accept redirects and OK responses
            }
        });
        
        if (response.status === 302 || response.status === 200) {
            console.log('  ✅ MYOB OAuth endpoint responds correctly');
            console.log(`  📋 Status: ${response.status}`);
            if (response.headers.location) {
                console.log(`  🔗 Redirects to: ${response.headers.location.substring(0, 100)}...`);
            }
        }
        
    } catch (error) {
        if (error.response && error.response.status === 302) {
            console.log('  ✅ MYOB OAuth endpoint responds with redirect (normal)');
            console.log(`  🔗 Redirects to: ${error.response.headers.location?.substring(0, 100)}...`);
        } else {
            console.log(`  ❌ MYOB OAuth endpoint error: ${error.message}`);
            if (error.response) {
                console.log(`  📋 Status: ${error.response.status}`);
                console.log(`  📄 Response: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
            }
        }
    }
    
    // Test the actual OAuth flow simulation
    console.log('\n🧪 OAuth Flow Simulation:');
    console.log('🎯 Manual Test Instructions:');
    console.log('1. Open this URL in your browser:');
    console.log(`   ${authUrl}`);
    console.log('2. Login with:');
    console.log('   Email: erik@hit-equipment.com.au');
    console.log('   Password: Heinous77!!');
    console.log('3. After login, you should be redirected to:');
    console.log(`   ${process.env.MYOB_REDIRECT_URI}?code=XXXX&state=${state}`);
    console.log('4. If you get a "connection refused" error, that\'s OK - it means OAuth worked');
    console.log('   but your server isn\'t running to handle the callback');
    
    // Start a minimal callback server for testing
    console.log('\n🚀 Starting Callback Test Server...');
    const express = require('express');
    const app = express();
    
    app.get('/auth/callback', (req, res) => {
        const { code, state: returnedState, error } = req.query;
        
        console.log('\n🎉 OAUTH CALLBACK RECEIVED!');
        console.log('===========================');
        console.log(`  Code: ${code ? 'RECEIVED ✅' : 'MISSING ❌'}`);
        console.log(`  State: ${returnedState ? 'RECEIVED ✅' : 'MISSING ❌'}`);
        console.log(`  Error: ${error || 'None ✅'}`);
        
        if (code && returnedState === state) {
            console.log('\n🎯 OAUTH FLOW SUCCESSFUL!');
            console.log('✅ Authorization code received');
            console.log('✅ State parameter matches');
            console.log('🔄 Next step: Exchange code for tokens');
            
            res.json({
                success: true,
                message: 'OAuth authorization successful!',
                code: code.substring(0, 20) + '...',
                state: returnedState,
                next_step: 'Exchange authorization code for access token'
            });
        } else {
            console.log('\n❌ OAUTH FLOW ISSUES:');
            if (!code) console.log('  - No authorization code received');
            if (returnedState !== state) console.log('  - State mismatch (CSRF protection triggered)');
            
            res.json({
                success: false,
                message: 'OAuth authorization failed',
                issues: {
                    code: code ? 'Present' : 'Missing',
                    state: returnedState === state ? 'Valid' : 'Invalid'
                }
            });
        }
    });
    
    app.get('/health', (req, res) => {
        res.json({ status: 'OK', message: 'OAuth test server running' });
    });
    
    const server = app.listen(3000, '0.0.0.0', () => {
        console.log('  ✅ Callback server started on http://cashflowtrends.ai:3000');
        console.log('  🔗 Health: http://cashflowtrends.ai:3000/health');
        console.log('  📥 Callback: http://cashflowtrends.ai:3000/auth/callback');
        console.log('\n🎯 NOW TEST THE OAUTH FLOW:');
        console.log(`   Open: ${authUrl}`);
        console.log('   Login: erik@hit-equipment.com.au / Heinous77!!');
        console.log('\n   Press Ctrl+C to stop server');
    });
    
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping OAuth test server...');
        server.close(() => {
            console.log('✅ Server stopped');
            process.exit(0);
        });
    });
}

verifyOAuth().catch(error => {
    console.error('💥 OAuth verification failed:', error.message);
    process.exit(1);
}); 