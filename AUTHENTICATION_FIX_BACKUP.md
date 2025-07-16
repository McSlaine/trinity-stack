# Critical Authentication Fixes - Backup

## Date: July 16, 2025

### Problem
The application was experiencing 502 Bad Gateway errors due to:
1. Missing session middleware causing 500 errors on `/auth/myob`
2. Database SSL certificate issues preventing server startup
3. Missing errorHandler middleware
4. Server listening on wrong port (80 instead of 3000)
5. Encryption key regenerating on each restart, invalidating tokens

### Solutions Applied

#### 1. Added Session Middleware to server.js
```javascript
// Add these imports at the top
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');

// Add this after express.json() middleware
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'your-session-secret-here-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));
```

#### 2. Fixed Database SSL Configuration in db.js
```javascript
// Parse the DATABASE_URL to handle SSL properly
let connectionString = process.env.DATABASE_URL;

// Remove sslmode parameter from URL if present (we'll handle SSL in the config)
connectionString = connectionString.replace(/\?sslmode=\w+/, '');

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false,
        require: true
    }
});
```

#### 3. Fixed Server Port Configuration in server.js
```javascript
// Change from:
const port = process.env.PORT || 80;

// To:
const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
  console.log('Server started at:', new Date().toLocaleString());
});
```

#### 4. Fixed Static File Security in server.js
```javascript
// Change from:
app.use(express.static(__dirname));

// To:
app.use(express.static(path.join(__dirname, 'public')));
```

#### 5. Fixed Encryption Key in tokenStore.js
```javascript
// Change from:
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// To:
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.error('FATAL: ENCRYPTION_KEY not set in environment variables');
  process.exit(1);
}
```

#### 6. Added Error Handler Middleware (middleware/errorHandler.js)
```javascript
module.exports = (err, req, res, next) => {
  console.error('Unhandled Error:', err.stack || err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation Error', details: err.message });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized', details: err.message });
  }
  
  // Default error response
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

#### 7. Updated Server Initialization to Continue on Partial Failures
```javascript
// In server.js initialization
(async () => {
  try {
    await tokenStore.initTokenStore();
    console.log('Token store initialized.');
    
    try {
      await initDb();
      console.log('Database connected successfully.');
    } catch (dbError) {
      console.error('Database connection failed:', dbError.message);
      console.error('Server will continue running without database functionality.');
    }
    
    try {
      await initVectorServices();
      console.log('Vector services initialized.');
    } catch (vectorError) {
      console.error('Vector services initialization failed:', vectorError.message);
      console.error('Server will continue running without vector functionality.');
    }
  } catch (err) {
    console.error('FATAL: Failed to initialize token store.', err);
    process.exit(1);
  }
})();
```

### Environment Variables Required
Add these to .env file:
```
ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
SESSION_SECRET=<any secure random string>
MYOB_CLIENT_ID=3502423a-cfd5-40f8-b7c8-af12d72241a3
MYOB_CLIENT_SECRET=51zxmK3RmZkGkR8lhOv1goS3
MYOB_REDIRECT_URI=https://cashflowtrends.ai/auth/callback
```

### File Structure Changes
- Moved all HTML/CSS/JS frontend files from root to `/public/` directory
- Created `/middleware/errorHandler.js`

### Current Status
- Server runs on port 3000
- Authentication flow works up to MYOB redirect
- Session management is functional
- Database connects successfully with SSL

### Remaining Issue
The callback is receiving authorization codes starting with `ory_ac_` which suggests the OAuth flow is still going to Ory instead of MYOB. This needs investigation. 