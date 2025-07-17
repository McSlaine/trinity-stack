require('dotenv').config();
const redis = require('redis');
const { decrypt } = require('./tokenStore'); // We need the decrypt function

const TOKEN_KEY = process.env.TOKENSTORE_KEY || 'myob_token';

/**
 * This script directly connects to Redis to find and inspect the MYOB token.
 * It will help diagnose why the standard getToken() call is failing.
 */
async function debugTokenCheck() {
    console.log('Connecting directly to Redis to find the token...');
    const redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => console.error('Redis Client Error', err));

    try {
        await redisClient.connect();
        console.log('Successfully connected to Redis.');

        const encryptedToken = await redisClient.get(TOKEN_KEY);

        if (!encryptedToken) {
            console.log(`\n-------------------------------------------------------------------`);
            console.log(`RESULT: No token found in Redis under the key: "${TOKEN_KEY}"`);
            console.log(`This confirms the login process did not store a global token.`);
            console.log(`Please proceed with the login URL provided previously to establish a token.`);
            console.log(`-------------------------------------------------------------------\n`);
            await redisClient.quit();
            return;
        }

        console.log('Encrypted token found in Redis. Attempting to decrypt...');

        try {
            const decryptedToken = decrypt(encryptedToken);
            const tokenData = JSON.parse(decryptedToken);

            console.log(`\n-------------------------------------------------------------------`);
            console.log('SUCCESS: Token found and decrypted successfully!');
            console.log('Token Details:');
            console.log(`  - Access Token: ...${tokenData.access_token.slice(-6)}`);
            console.log(`  - Refresh Token: ...${tokenData.refresh_token.slice(-6)}`);
            console.log(`  - Stored at: ${new Date(tokenData.timestamp).toLocaleString()}`);
            console.log(`-------------------------------------------------------------------\n`);
            console.log('This confirms a token exists. The previous script likely failed due to an environment or context issue.');
            console.log('You can now proceed to the company selection page in your browser to trigger a sync.');


        } catch (e) {
            console.error('\n-------------------------------------------------------------------');
            console.error('ERROR: Found a token, but failed to decrypt it.');
            console.error('This could be due to a mismatch in the ENCRYPTION_KEY.');
            console.error('Error details:', e.message);
            console.error('-------------------------------------------------------------------\n');
        }

        await redisClient.quit();

    } catch (error) {
        console.error('Failed to connect to or query Redis:', error.message);
    }
}

debugTokenCheck();
