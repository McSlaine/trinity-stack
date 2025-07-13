const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync('/home/cashflow-trends-ai/ca-certificate.crt').toString(),
  },
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_files (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        uri TEXT,
        country VARCHAR(2),
        last_sync_status VARCHAR(50) DEFAULT 'Never',
        last_sync_timestamp TIMESTAMPTZ
      );
      
      CREATE TABLE IF NOT EXISTS invoices (
        uid UUID PRIMARY KEY,
        company_file_id UUID REFERENCES company_files(id),
        number VARCHAR(255),
        date TIMESTAMPTZ,
        customer_name VARCHAR(255),
        balance_due_amount DECIMAL(12, 2),
        status VARCHAR(50),
        due_date TIMESTAMPTZ,
        total_amount DECIMAL(12, 2),
        raw_data JSONB
      );

      CREATE TABLE IF NOT EXISTS bills (
        uid UUID PRIMARY KEY,
        company_file_id UUID REFERENCES company_files(id),
        number VARCHAR(255),
        date TIMESTAMPTZ,
        supplier_name VARCHAR(255),
        balance_due_amount DECIMAL(12, 2),
        status VARCHAR(50),
        due_date TIMESTAMPTZ,
        total_amount DECIMAL(12, 2),
        raw_data JSONB
      );

      CREATE TABLE IF NOT EXISTS sync_progress (
        company_file_id UUID PRIMARY KEY REFERENCES company_files(id),
        total_items INT,
        processed_items INT,
        status VARCHAR(50)
      );

      CREATE TABLE IF NOT EXISTS accounts (
        uid UUID PRIMARY KEY,
        company_file_id UUID REFERENCES company_files(id),
        name VARCHAR(255),
        display_id VARCHAR(50),
        type VARCHAR(50),
        classification VARCHAR(50),
        current_balance DECIMAL(12, 2),
        raw_data JSONB
      );

      CREATE TABLE IF NOT EXISTS customers (
        uid UUID PRIMARY KEY,
        company_file_id UUID REFERENCES company_files(id),
        name VARCHAR(255),
        raw_data JSONB
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        uid UUID PRIMARY KEY,
        company_file_id UUID REFERENCES company_files(id),
        name VARCHAR(255),
        raw_data JSONB
      );

      CREATE TABLE IF NOT EXISTS profit_and_loss_reports (
        id SERIAL PRIMARY KEY,
        company_file_id UUID REFERENCES company_files(id),
        report_year INT,
        report_month INT,
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_file_id, report_year, report_month)
      );
    `);

    // Add country column to company_files if it doesn't exist
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='company_files' AND column_name='country'
    `);
    if (res.rows.length === 0) {
      await client.query('ALTER TABLE company_files ADD COLUMN country VARCHAR(2)');
    }

    await client.query('COMMIT');
    console.log('Database tables initialized successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing database tables:', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  initDb
};
