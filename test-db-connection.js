// test-db-connection.js - Test database connection with fixed SSL
require('dotenv').config();
const { Pool } = require('pg');

async function testDatabase() {
    console.log('🧪 TESTING DATABASE CONNECTION');
    console.log('==============================');
    
    console.log(`📊 Database URL: ${process.env.DATABASE_URL.substring(0, 50)}...`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    
    try {
        console.log('\n🔧 Configuring connection pool...');
        
        // Use the same logic as db.js
        let connectionString = process.env.DATABASE_URL;
        let poolConfig;
        
        if (process.env.NODE_ENV === 'development') {
            console.log('📊 Using development mode configuration');
            
            if (connectionString.includes('digitalocean.com') || connectionString.includes('sslmode=require')) {
                console.log('🔒 SSL required for database connection');
                console.log('🔧 Configuring SSL for DigitalOcean database...');
                
                poolConfig = {
                    connectionString: connectionString,
                    ssl: {
                        rejectUnauthorized: false // Accept DigitalOcean's SSL certificates
                    },
                    max: 2, // Small pool for testing
                    connectionTimeoutMillis: 10000,
                };
            } else {
                console.log('📊 Using local database configuration');
                poolConfig = {
                    connectionString: connectionString,
                    ssl: false,
                    max: 2,
                    connectionTimeoutMillis: 10000,
                };
            }
        }
        
        console.log('🔌 Creating connection pool...');
        const pool = new Pool(poolConfig);
        
        console.log('🔗 Attempting to connect...');
        const client = await pool.connect();
        
        console.log('✅ Connected! Running test query...');
        const result = await client.query('SELECT NOW() as current_time, version() as pg_version, current_database() as database_name');
        
        const row = result.rows[0];
        console.log('\n🎉 DATABASE CONNECTION SUCCESSFUL!');
        console.log('==================================');
        console.log(`📅 Current Time: ${row.current_time}`);
        console.log(`🗄️  Database: ${row.database_name}`);
        console.log(`🐘 PostgreSQL: ${row.pg_version.split(' ')[1]}`);
        
        // Test a simple table query (if tables exist)
        try {
            const tableResult = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5");
            console.log(`📋 Found ${tableResult.rows.length} tables in database`);
            if (tableResult.rows.length > 0) {
                console.log('   Tables:');
                tableResult.rows.forEach(row => {
                    console.log(`   - ${row.table_name}`);
                });
            }
        } catch (tableError) {
            console.log('📋 Could not list tables (may be permissions or empty database)');
        }
        
        client.release();
        await pool.end();
        
        console.log('\n✅ ALL DATABASE TESTS PASSED!');
        console.log('Your database connection is working properly.');
        console.log('\n🚀 Ready to run full application:');
        console.log('   node server.js');
        
    } catch (error) {
        console.log('\n❌ DATABASE CONNECTION FAILED');
        console.log('=============================');
        console.log(`Error: ${error.message}`);
        console.log(`Code: ${error.code}`);
        
        if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
            console.log('\n💡 SSL Certificate Issue:');
            console.log('   - This is a DigitalOcean SSL certificate issue');
            console.log('   - The fix should handle this, but may need adjustment');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Connection Refused:');
            console.log('   - Check if DATABASE_URL is correct');
            console.log('   - Verify network connectivity');
        } else if (error.code === 'ENOTFOUND') {
            console.log('\n💡 DNS/Host Issue:');
            console.log('   - Check DATABASE_URL hostname');
            console.log('   - Verify internet connection');
        }
        
        process.exit(1);
    }
}

testDatabase(); 