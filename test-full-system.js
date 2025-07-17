// test-full-system.js - Full system test with OAuth verification
require('dotenv').config();
const axios = require('axios');
const { testConnection, pool } = require('./db.js'); // Import the fixed connection test and pool

async function testFullSystem() {
    console.log('🧪 FULL SYSTEM TEST - Cashflow Trends AI');
    console.log('=========================================');
    
    let errors = 0;
    
    // Test 1: Environment Variables
    console.log('\n📋 1. Environment Variables:');
    const requiredVars = ['DATABASE_URL', 'MYOB_CLIENT_ID', 'MYOB_CLIENT_SECRET', 'MYOB_REDIRECT_URI'];
    requiredVars.forEach(varName => {
        if (process.env[varName]) {
            console.log(`  ✅ ${varName}: Set`);
        } else {
            console.log(`  ❌ ${varName}: Missing`);
            errors++;
        }
    });
    
    console.log(`  🔗 Redirect URI: ${process.env.MYOB_REDIRECT_URI}`);
    
    // Test 2: Database Connection using db.js
    console.log('\n📊 2. Database Connection Test (using db.js):');
    try {
        await testConnection();
        console.log('  ✅ Database connection successful via db.js.');
    } catch (error) {
        console.log(`  ❌ Database connection failed: ${error.message}`);
        errors++;
    }
    
    // Test 3: MYOB OAuth URL Generation
    console.log('\n🔐 3. MYOB OAuth Configuration:');
    const state = 'test-state-' + Date.now();
    const scope = encodeURIComponent('CompanyFile offline_access');
    const authUrl = `https://secure.myob.com/oauth2/account/authorize?client_id=${process.env.MYOB_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.MYOB_REDIRECT_URI)}&response_type=code&scope=${scope}&state=${state}`;
    
    console.log(`  🔗 OAuth URL: ${authUrl.substring(0, 100)}...`);
    
    // Test 4: Check MYOB OAuth Endpoint
    console.log('\n🌐 4. MYOB Service Availability:');
    try {
        const response = await axios.head('https://secure.myob.com/oauth2/account/authorize', {
            timeout: 5000,
            validateStatus: () => true // Accept any status
        });
        console.log(`  ✅ MYOB OAuth endpoint reachable (Status: ${response.status})`);
    } catch (error) {
        console.log(`  ❌ MYOB OAuth endpoint error: ${error.message}`);
        errors++;
    }
    
    // Summary
    console.log('\n🎯 TEST SUMMARY:');
    console.log('================');
    if (errors === 0) {
        console.log('✅ ALL SYSTEM CHECKS PASSED!');
        console.log('\n🔥 The application appears to be configured correctly.');
        console.log('   The main server is already running, so no test server was started.');
    } else {
        console.log(`❌ ${errors} error(s) found. Please review the logs and fix the configuration.`);
        process.exit(1); // Exit with error code if tests fail
    }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
    console.error('💥 Unhandled rejection:', error.message);
    process.exit(1);
});

testFullSystem().catch(error => {
    console.error('💥 Test script failed:', error.message);
    process.exit(1);
}).finally(() => {
    console.log('\nTest script finished.');
    // End the pool connection to allow the script to exit gracefully
    pool.end().then(() => console.log('Database pool has been closed.'));
}); 