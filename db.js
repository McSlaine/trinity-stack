// db.js - Fixed SSL Configuration for DigitalOcean PostgreSQL
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set.");
}

console.log('🔧 Configuring database connection...');

let pool;
let connectionString = process.env.DATABASE_URL;

// Development mode: Try secure SSL first, fallback if needed
if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development mode: using permissive SSL for now');
    console.log('📝 Note: Download correct cluster CA certificate from DigitalOcean for production');
    
    // Remove sslmode=require from connection string for development
    connectionString = connectionString.replace(/[?&]sslmode=require/, '');
    console.log('🔧 Removed sslmode=require for development flexibility');
    
    pool = new Pool({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false, // Development only - allows connection with any cert
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
    });
    console.log('🔒 Development SSL enabled (permissive mode)');
    
} else {
    // Production - require proper CA certificate
    const caCertPath = path.join(__dirname, 'ca-certificate.crt');
    if (!fs.existsSync(caCertPath)) {
        console.error('❌ PRODUCTION ERROR: CA certificate required');
        process.exit(1);
    }
    
    const caCert = fs.readFileSync(caCertPath, 'utf8');
    pool = new Pool({
        connectionString: connectionString, // Keep original for production
        ssl: {
            rejectUnauthorized: true,
            ca: caCert,
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
    });
    console.log('🔒 Production SSL with CA certificate validation');
}

// --- Event Listeners for Logging ---
pool.on('connect', (client) => {
    console.log('✅ Database client connected');
});

pool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle database client', err);
    process.exit(-1);
});

pool.on('remove', (client) => {
    console.log('📤 Database client removed');
});

// Test the connection on startup
async function testConnection() {
    try {
        const result = await pool.query('SELECT version();');
        console.log('🎉 Database connection test successful');
        console.log('📊 PostgreSQL version:', result.rows[0].version.substring(0, 50) + '...');
    } catch (error) {
        console.error('❌ Database connection test failed:', error.message);
        throw error;
    }
}

// Alias for server.js compatibility
async function initDb() {
    try {
        console.log('🔧 Initializing database connection...');
        await testConnection();
        console.log('✅ Database initialization completed');
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        throw error;
    }
}

// --- Export Query Function ---
module.exports = {
    query: (text, params) => pool.query(text, params),
    pool, // Export the pool itself for more complex transactions if needed
    testConnection, // Export test function
    initDb, // Export for server.js compatibility
};