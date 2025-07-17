const { AuthError } = require('../lib/errors');

/**
 * Middleware to protect routes that require authentication.
 * It checks if the user has a valid session.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    // User is authenticated, proceed to the next middleware or route handler
    return next();
  } else {
    // User is not authenticated, send a 401 Unauthorized error
    return next(new AuthError('You must be logged in to access this resource.'));
  }
}

module.exports = { requireAuth };