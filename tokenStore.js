// tokenStore.js - Simplified for Development
const crypto = require('crypto');

let tokenStorage = {}; // In-memory storage for development
let useRedis = false;
let keyv = null;

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.error('FATAL: ENCRYPTION_KEY not set in environment variables');
  process.exit(1);
}
const IV_LENGTH = 16;

// Initialize storage based on environment
async function initTokenStore() {
  if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
    console.log('🔧 Initializing Redis token store for production...');
    const Keyv = require('keyv');
    keyv = new Keyv(process.env.REDIS_URL);
    keyv.on('error', err => console.error('❌ Redis connection error:', err));
    useRedis = true;
    console.log('✅ Token store (Redis + encryption) initialized');
  } else {
    console.log('🔧 Initializing in-memory token store for development...');
    tokenStorage = {};
    useRedis = false;
    console.log('✅ Token store (in-memory) initialized');
  }
}

// Encryption functions (only used in production)
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Store the token data
async function storeToken(tokenData) {
  if (!tokenData || !tokenData.access_token || !tokenData.refresh_token) {
    throw new Error('Invalid token data: missing access_token or refresh_token');
  }
  
  const currentToken = await getToken() || {};
  const newToken = { 
    ...currentToken, 
    ...tokenData,
    timestamp: Date.now() // Add timestamp for expiry tracking
  };

  const TOKEN_KEY = process.env.TOKENSTORE_KEY || 'myob_token';

  if (useRedis && keyv) {
    // Production: Use Redis with encryption
    const encrypted = encrypt(JSON.stringify(newToken));
    await keyv.set(TOKEN_KEY, encrypted);
    if (process.env.TOKENSTORE_LOGGING === 'true') {
      console.log('🔐 Token stored securely in Redis');
    }
  } else {
    // Development: Use in-memory storage (no encryption needed)
    tokenStorage[TOKEN_KEY] = newToken;
    if (process.env.TOKENSTORE_LOGGING === 'true') {
      console.log('💾 Token stored in memory (development mode)');
    }
  }
}

// Retrieve the token data
async function getToken() {
  const TOKEN_KEY = process.env.TOKENSTORE_KEY || 'myob_token';

  if (useRedis && keyv) {
    // Production: Get from Redis and decrypt
    const encrypted = await keyv.get(TOKEN_KEY);
    if (!encrypted) return null;
    try {
      const decrypted = decrypt(encrypted);
      const token = JSON.parse(decrypted);
      if (!token.access_token || !token.refresh_token) return null;
      return token;
    } catch (err) {
      console.error('❌ Token decryption failed:', err);
      return null;
    }
  } else {
    // Development: Get from memory
    const token = tokenStorage[TOKEN_KEY];
    if (!token || !token.access_token || !token.refresh_token) return null;
    return token;
  }
}

// Clear token (useful for logout or when refresh fails)
async function deleteToken() {
  const TOKEN_KEY = process.env.TOKENSTORE_KEY || 'myob_token';

  if (useRedis && keyv) {
    await keyv.delete(TOKEN_KEY);
    console.log('🗑️ Token cleared from Redis');
  } else {
    delete tokenStorage[TOKEN_KEY];
    console.log('🗑️ Token cleared from memory');
  }
}

module.exports = { initTokenStore, storeToken, getToken, deleteToken };
