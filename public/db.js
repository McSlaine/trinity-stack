// db.js
require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set.");
}

const pool = new Pool({
    connectionString: `${process.env.DATABASE_URL}`,
    ssl: {
        rejectUnauthorized: false,
    }
});

async function query(text, params) {
    const client = await pool.connect();
    try {
        return await client.query(text, params);
    } finally {
        client.release();
    }
}

async function insertCompany(myob_uid, name) {
    const text = `
        INSERT INTO company_files (myob_uid, name)
        VALUES ($1, $2)
        ON CONFLICT (myob_uid) DO UPDATE SET name = EXCLUDED.name
        RETURNING id;
    `;
    const res = await query(text, [myob_uid, name]);
    return res.rows[0].id;
}

/**
 * Logs a general synchronization attempt.
 * @param {number} companyId The ID of the company.
 * @param {boolean} success Whether the sync was successful.
 * @param {string} message A descriptive message.
 * @param {number} vectorsInserted The number of vectors inserted during the sync.
 */
async function logSync(companyId, success, message, vectorsInserted = 0) {
    const text = `
        INSERT INTO sync_log (company_id, success, message, vectors_inserted)
        VALUES ($1, $2, $3, $4);
    `;
    await query(text, [companyId, success, message, vectorsInserted]);
    const updateText = `
        UPDATE company_files SET last_synced = CURRENT_TIMESTAMP, error_msg = $1 WHERE id = $2;
    `;
    await query(updateText, [success ? null : message, companyId]);
}

async function logSyncError(companyId, stage, error_details) {
    const message = `Sync failed at stage: ${stage}`;
    const text = `
        INSERT INTO sync_log (company_id, success, message, error_details)
        VALUES ($1, false, $2, $3);
    `;
    await query(text, [companyId, message, error_details]);
    const updateText = `
        UPDATE company_files SET last_synced = CURRENT_TIMESTAMP, error_msg = $1 WHERE id = $2;
    `;
    await query(updateText, [message, companyId]);
}

async function insertInvoices(companyId, invoiceArray) {
    if (!invoiceArray || invoiceArray.length === 0) return;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const text = `
            INSERT INTO invoices (company_id, invoice_uid, date_issued, due_date, amount_total, amount_paid, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (invoice_uid) DO UPDATE SET
                date_issued = EXCLUDED.date_issued,
                due_date = EXCLUDED.due_date,
                amount_total = EXCLUDED.amount_total,
                amount_paid = EXCLUDED.amount_paid,
                status = EXCLUDED.status;
        `;
        for (const invoice of invoiceArray) {
            await client.query(text, [companyId, invoice.invoice_uid, invoice.date_issued, invoice.due_date, invoice.amount_total, invoice.amount_paid, invoice.status]);
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function insertBills(companyId, billArray) {
    if (!billArray || billArray.length === 0) return;
    // Placeholder
}

async function insertGST(companyId, gstArray) {
    if (!gstArray || gstArray.length === 0) return;
    // Placeholder
}

async function initDb() {
    try {
        const client = await pool.connect();
        console.log('Database connected successfully.');
        client.release();
    } catch (err) {
        console.error('Unable to connect to the database:', err);
        throw err;
    }
}

module.exports = { query, insertCompany, logSync, logSyncError, insertInvoices, insertBills, insertGST, initDb };