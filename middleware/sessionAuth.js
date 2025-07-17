// Session-based authentication middleware
function requireSessionAuth(req, res, next) {
    console.log('🔍 SessionAuth Debug:', {
        hasSession: !!req.session,
        sessionKeys: req.session ? Object.keys(req.session) : [],
        hasToken: !!(req.session && req.session.token),
        isAuthenticated: !!(req.session && req.session.isAuthenticated),
        sessionId: req.sessionID
    });
    
    if (!req.session || !req.session.token) {
        console.log('❌ SessionAuth FAILED - no session or token');
        return res.status(401).json({ 
            error: 'Authentication required. Please log in first.' 
        });
    }
    
    console.log('✅ SessionAuth PASSED');
    next();
}

module.exports = { requireSessionAuth }; 