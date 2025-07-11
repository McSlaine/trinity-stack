const storage = require('node-persist');

// Initialize the token store. This should be called when your server starts.
const TOKEN_KEY = process.env.TOKENSTORE_KEY || 'myob_token';
async function initTokenStore() {
  try {
    await storage.init({
      dir: process.env.TOKENSTORE_DIR || './tokenStore',
      stringify: JSON.stringify,
      parse: JSON.parse,
      encoding: 'utf8',
      logging: false,
      continuous: true,
      interval: false
    });
    console.log('Token store initialized');
  } catch (err) {
    console.error('Failed to initialize token store:', err);
    throw err;
  }
}

// Store the token data persistently.
async function storeToken(tokenData) {
  // tokenData should include properties like access_token, refresh_token, expires_in, etc.
  if (!tokenData || !tokenData.access_token || !tokenData.refresh_token) {
    throw new Error('Invalid token data: missing access_token or refresh_token');
  }
  await storage.setItem(TOKEN_KEY, tokenData);
  if (process.env.TOKENSTORE_LOGGING === 'true') console.log('Token stored successfully');
}

// Retrieve the token data.
async function getToken() {
  const token = await storage.getItem(TOKEN_KEY);
  if (!token || !token.access_token || !token.refresh_token) return null;
  return token;
}

module.exports = { initTokenStore, storeToken, getToken };
