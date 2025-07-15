const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const tokenStore = require('../tokenStore');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const MYOB_CLIENT_ID = process.env.MYOB_CLIENT_ID.trim();
const { MYOB_CLIENT_SECRET, MYOB_REDIRECT_URI } = process.env;
const AUTH_URL = 'https://secure.myob.com/oauth2/account/authorize';

// Redirect user to MYOB for authentication
router.get('/login', (req, res) => {
    const authUrl = `${AUTH_URL}?client_id=${MYOB_CLIENT_ID}&redirect_uri=${MYOB_REDIRECT_URI}&response_type=code&scope=CompanyFile`;
    res.redirect(authUrl);
});

// Handle the callback from MYOB
router.get('/callback', asyncHandler(async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).json({ error: 'Authorization code missing' });
    }

    const postData = querystring.stringify({
        client_id: MYOB_CLIENT_ID,
        client_secret: MYOB_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: MYOB_REDIRECT_URI,
    });

    const tokenResponse = await axios.post('https://secure.myob.com/oauth2/v1/authorize', postData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    await tokenStore.storeToken(tokenResponse.data);
    res.redirect('/');
}));

module.exports = router;