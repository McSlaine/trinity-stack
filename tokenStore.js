const storage = require('node-persist');

// Initialize the token store. This should be called when your server starts.
async function initTokenStore() {
  await storage.init({
    dir: './tokenStore',
    stringify: JSON.stringify,
    parse: JSON.parse,
    encoding: 'utf8',
    logging: false,  // Set to true for debugging logs
    continuous: true,
    interval: false
  });
  console.log('Token store initialized');
}

// Store the token data persistently.
async function storeToken(tokenData) {
  // tokenData should include properties like access_token, refresh_token, expires_in, etc.
  if (!tokenData || !tokenData.access_token || !tokenData.refresh_token) {
    throw new Error('Invalid token data: missing access_token or refresh_token');
  }
  await storage.setItem('myob_token', tokenData);
  if (process.env.TOKENSTORE_LOGGING === 'true') {
    console.log('Token stored successfully');
  }
}

// Retrieve the token data.
async function getToken() {
  const token = await storage.getItem('myob_token');
  if (!token || !token.access_token || !token.refresh_token) {
    return null;
  }
  return token;
}

module.exports = { initTokenStore, storeToken, getToken };
