require('dotenv').config();
const { getToken, storeToken } = require('./tokenStore');
const myob = require('./myobAdapter');
const crypto = require('crypto');

const MYOB_CLIENT_ID = process.env.MYOB_CLIENT_ID ? process.env.MYOB_CLIENT_ID.trim() : '';
const MYOB_REDIRECT_URI = process.env.MYOB_REDIRECT_URI ? process.env.MYOB_REDIRECT_URI.trim() : '';
const AUTH_URL = 'https://secure.myob.com/oauth2/account/authorize';

/**
 * Generates the MYOB authorization URL.
 * This is extracted from the logic in routes/auth.js.
 */
function getAuthorizationUrl() {
    const state = crypto.randomBytes(16).toString('hex');
    const scope = encodeURIComponent('offline_access openid');
    return `${AUTH_URL}?client_id=${MYOB_CLIENT_ID}&redirect_uri=${MYOB_REDIRECT_URI}&response_type=code&scope=${scope}&state=${state}`;
}

/**
 * This script checks for a valid MYOB access token and triggers a sync if possible.
 */
async function checkAuthAndSync() {
    console.log('Checking for existing MYOB access token...');
    let token = await getToken();

    if (!token) {
        console.log('No token found.');
        const authUrl = getAuthorizationUrl();
        console.log('\n-------------------------------------------------------------------');
        console.log('ACTION REQUIRED: Please log in to MYOB to continue.');
        console.log('Visit this URL in your browser:');
        console.log(authUrl);
        console.log('After authorizing, you will be redirected. Then, re-run this script.');
        console.log('-------------------------------------------------------------------\n');
        return;
    }

    console.log('Token found. Attempting to fetch company files to verify...');

    try {
        const companyFiles = await myob.getCompanyFiles();
        console.log('Authentication successful. Fetched company files:');
        console.log(companyFiles.map(cf => ({ id: cf.Id, name: cf.Name })));

        if (companyFiles.length > 0) {
            const firstCompany = companyFiles[0];
            console.log(`\nProceeding to trigger a sync for the first company file: "${firstCompany.Name}" (${firstCompany.Id})`);
            
            // Here you would call the /api/sync/:companyFileId endpoint.
            // For this script, we'll just simulate the action.
            console.log('-------------------------------------------------------------------');
            console.log('SUCCESS: A real sync would be triggered now.');
            console.log('Run the application and select a company file to trigger the full sync process.');
            console.log('-------------------------------------------------------------------');

        } else {
            console.log('No company files found for this account.');
        }

    } catch (error) {
        console.error('\n-------------------------------------------------------------------');
        console.error('Authentication failed or could not fetch company files.');
        console.error('Error:', error.message);
        
        if (error.response && error.response.status === 401) {
            console.log('This was likely due to an expired or invalid token.');
        }

        const authUrl = getAuthorizationUrl();
        console.log('\nACTION REQUIRED: Please try logging in to MYOB again.');
        console.log('Visit this URL in your browser:');
        console.log(authUrl);
        console.log('-------------------------------------------------------------------\n');
    }
}

checkAuthAndSync();