#!/usr/bin/env node

// Debug script for OAuth flow
require('dotenv').config();

console.log('=== OAuth Configuration Debug ===\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('   MYOB_CLIENT_ID:', process.env.MYOB_CLIENT_ID);
console.log('   MYOB_CLIENT_SECRET:', process.env.MYOB_CLIENT_SECRET ? '***SET***' : 'NOT SET');
console.log('   MYOB_REDIRECT_URI:', process.env.MYOB_REDIRECT_URI);

// Build the OAuth URL
const MYOB_CLIENT_ID = process.env.MYOB_CLIENT_ID?.trim();
const MYOB_REDIRECT_URI = process.env.MYOB_REDIRECT_URI;
const AUTH_URL = 'https://secure.myob.com/oauth2/account/authorize';
const state = 'test-state-123';
const scope = encodeURIComponent('offline_access openid');

const authUrl = `${AUTH_URL}?client_id=${MYOB_CLIENT_ID}&redirect_uri=${MYOB_REDIRECT_URI}&response_type=code&scope=${scope}&state=${state}`;

console.log('\n2. Generated OAuth URL:');
console.log(authUrl);

console.log('\n3. Debugging the callback issue:');
console.log('   - The authorization code starting with "ory_ac_" indicates Ory (not MYOB)');
console.log('   - This suggests the browser is being redirected to a different OAuth provider');
console.log('   - Possible causes:');
console.log('     a) Browser extension intercepting OAuth flows');
console.log('     b) DNS resolution issues');
console.log('     c) Proxy or VPN redirecting traffic');

console.log('\n4. To test directly:');
console.log('   Open this URL in an incognito/private browser window:');
console.log('   ' + authUrl);

console.log('\n5. Expected behavior:');
console.log('   - You should see MYOB\'s login page');
console.log('   - After login, you should be redirected to:');
console.log('   ' + MYOB_REDIRECT_URI + '?code=<MYOB_CODE>&state=' + state);
console.log('   - The code should NOT start with "ory_ac_"');

console.log('\n=== End Debug ==='); 