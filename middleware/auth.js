const { AuthError } = require('../lib/errors');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader !== 'Bearer dev-token') {
    return next(new AuthError('Invalid or missing token.'));
  }
  next();
}

module.exports = { requireAuth };
