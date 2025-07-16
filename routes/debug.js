const express = require('express');
const { pool } = require('../db');
const fs = require('fs').promises;
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../lib/errors');

const router = express.Router();

// Debug endpoint to check AI chat context data
router.get('/chat-context/:companyId', asyncHandler(async (req, res, next) => {
    const { companyId } = req.params;
    const { rows: invoices } = await pool.query('SELECT number, customer_name, balance_due_amount, due_date, status FROM invoices WHERE company_file_id = $1', [companyId]);
    const { rows: bills } = await pool.query('SELECT number, supplier_name, balance_due_amount, due_date, status FROM bills WHERE company_file_id = $1', [companyId]);
    res.json({ invoices, bills });
}));

// Debug endpoint to check DB record counts
router.get('/db-check/:id', asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const invoices = await client.query('SELECT COUNT(*) FROM invoices WHERE company_file_id = $1', [id]);
        const bills = await client.query('SELECT COUNT(*) FROM bills WHERE company_file_id = $1', [id]);
        const accounts = await client.query('SELECT COUNT(*) FROM accounts WHERE company_file_id = $1', [id]);
        res.json({
            invoices: invoices.rows[0].count,
            bills: bills.rows[0].count,
            accounts: accounts.rows[0].count,
        });
    } finally {
        client.release();
    }
}));

// Debug endpoint to get server log
router.get('/get-log', asyncHandler(async (req, res, next) => {
    try {
        const data = await fs.readFile('server.log', 'utf8');
        res.send(data);
    } catch (err) {
        // If the file doesn't exist, it's not a server error, but a "not found" case.
        if (err.code === 'ENOENT') {
            return next(new AppError('Log file not found.', 404));
        }
        // For other errors (e.g., permissions), it's a server error.
        return next(err);
    }
}));

const tokenStore = require('../tokenStore');

router.get('/get-token', asyncHandler(async (req, res) => {
    const token = await tokenStore.getToken();
    res.json(token);
}));

module.exports = router;
