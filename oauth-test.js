// oauth-test.js - Test MYOB OAuth Integration
require('dotenv').config();
const axios = require('axios');

async function testOAuthFlow() {
    console.log('🔐 Testing MYOB OAuth Integration');
    console.log('================================');
    
    // Test environment variables
    console.log('\n📋 Environment Check:');
    console.log(`  MYOB_CLIENT_ID: ${process.env.MYOB_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`  MYOB_CLIENT_SECRET: ${process.env.MYOB_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`  MYOB_REDIRECT_URI: ${process.env.MYOB_REDIRECT_URI}`);
    
    // Test MYOB OAuth URL generation
    console.log('\n🔗 OAuth URL Generation:');
    const state = 'test-state-123';
    const scope = encodeURIComponent('CompanyFile offline_access');
    const authUrl = `https://secure.myob.com/oauth2/account/authorize?client_id=${process.env.MYOB_CLIENT_ID}&redirect_uri=${process.env.MYOB_REDIRECT_URI}&response_type=code&scope=${scope}&state=${state}`;
    
    console.log(`  Generated OAuth URL:`);
    console.log(`  ${authUrl}`);
    
    // Test if OAuth endpoint is reachable
    console.log('\n🌐 Testing MYOB OAuth Endpoint:');
    try {
        const response = await axios.head('https://secure.myob.com/oauth2/account/authorize', {
            timeout: 5000
        });
        console.log(`  ✅ MYOB OAuth endpoint reachable (Status: ${response.status})`);
    } catch (error) {
        console.log(`  ❌ MYOB OAuth endpoint unreachable: ${error.message}`);
    }
    
    // Test basic configuration
    console.log('\n⚙️ Configuration Validation:');
    
    const redirectUri = process.env.MYOB_REDIRECT_URI;
    if (redirectUri && (redirectUri.includes('cashflowtrends.ai:3000') || redirectUri.includes('localhost:3000'))) {
        console.log('  ✅ Redirect URI configured for development');
    } else {
        console.log('  ⚠️  Redirect URI may need updating for your server domain:3000');
    }
    
    if (process.env.NODE_ENV === 'development') {
        console.log('  ✅ Running in development mode');
    } else {
        console.log('  ⚠️  NODE_ENV should be "development"');
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Start the server: node server.js');
    console.log('2. Open browser: http://cashflowtrends.ai:3000/auth/myob');
    console.log('3. Login with: erik@hit-equipment.com.au');
    console.log('4. Complete OAuth flow');
    
    console.log('\n📋 OAuth Flow Expected:');
    console.log('  Browser → http://cashflowtrends.ai:3000/auth/myob');
    console.log('  Redirect → MYOB login page');
    console.log('  Login → erik@hit-equipment.com.au / Heinous77!!');
    console.log('  Success → http://cashflowtrends.ai:3000/auth/callback');
    console.log('  Final → Company file selection page');
}

testOAuthFlow().catch(error => {
    console.error('❌ OAuth test failed:', error.message);
}); 