// Session-based authentication middleware
function requireSessionAuth(req, res, next) {
    if (!req.session || !req.session.token) {
        return res.status(401).json({ 
            error: 'Authentication required. Please log in first.' 
        });
    }
    next();
}

module.exports = { requireSessionAuth }; 