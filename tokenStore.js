const Keyv = require('keyv');
const crypto = require('crypto');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.error('FATAL: ENCRYPTION_KEY not set in environment variables');
  process.exit(1);
}
const IV_LENGTH = 16;

// Initialize Keyv with Redis if available
const keyv = new Keyv(process.env.REDIS_URL ? `redis://${process.env.REDIS_URL.replace('redis://', '')}` : undefined);
keyv.on('error', err => console.log('Keyv connection error:', err));

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

// Initialize the token store. This should be called when your server starts.
const TOKEN_KEY = process.env.TOKENSTORE_KEY || 'myob_token';
async function initTokenStore() {
  // Keyv initializes on first use, no explicit init needed
  console.log('Token store (Keyv with Redis) initialized');
}

// Store the token data persistently.
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
  const encrypted = encrypt(JSON.stringify(newToken));
  await keyv.set(TOKEN_KEY, encrypted);
  if (process.env.TOKENSTORE_LOGGING === 'true') console.log('Token stored successfully');
}

// Retrieve the token data.
async function getToken() {
  const encrypted = await keyv.get(TOKEN_KEY);
  if (!encrypted) return null;
  try {
    const decrypted = decrypt(encrypted);
    const token = JSON.parse(decrypted);
    if (!token.access_token || !token.refresh_token) return null;
    return token;
  } catch (err) {
    console.error('Decryption failed:', err);
    return null;
  }
}

module.exports = { initTokenStore, storeToken, getToken };
