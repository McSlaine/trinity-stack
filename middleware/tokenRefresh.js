const tokenStore = require('../tokenStore');
const { refreshToken } = require('../myobAdapter');

// Middleware to ensure MYOB token is fresh
async function ensureFreshToken(req, res, next) {
    try {
        const token = await tokenStore.getToken();
        
        if (!token) {
            // No token at all - user needs to re-authenticate
            return next();
        }
        
        // Check if token might be expired (tokens last 20 minutes)
        // We'll refresh if we don't have a timestamp or if it's been > 15 minutes
        const now = Date.now();
        const tokenAge = token.timestamp ? now - token.timestamp : Infinity;
        const fifteenMinutes = 15 * 60 * 1000;
        
        if (tokenAge > fifteenMinutes) {
            console.log('Token might be stale, refreshing proactively...');
            try {
                await refreshToken();
                console.log('Token refreshed successfully');
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError.message);
                // Continue anyway - the actual API call will handle 401 if needed
            }
        }
        
        next();
    } catch (error) {
        console.error('Error in token refresh middleware:', error);
        next(); // Continue anyway
    }
}

module.exports = { ensureFreshToken }; 