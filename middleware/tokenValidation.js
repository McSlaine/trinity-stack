const tokenStore = require('../tokenStore');

async function requireToken(req, res, next) {
    const token = await tokenStore.getToken();
    if (!token || !token.access_token) {
        return res.status(401).json({ 
            error: 'Authentication required. Please log in to MYOB first.' 
        });
    }
    // A more advanced version would proactively refresh the token if it's about to expire.
    // For now, we rely on the reactive refresh in the API helper.
    next();
}

module.exports = { requireToken };
