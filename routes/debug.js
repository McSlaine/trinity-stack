const express = require('express');
const { pool } = require('../db');
const fs = require('fs');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// Debug endpoint to check AI chat context data
router.get('/chat-context/:companyId', asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    try {
        const { rows: invoices } = await pool.query('SELECT number, customer_name, balance_due_amount, due_date, status FROM invoices WHERE company_file_id = $1', [companyId]);
        const { rows: bills } = await pool.query('SELECT number, supplier_name, balance_due_amount, due_date, status FROM bills WHERE company_file_id = $1', [companyId]);
        res.json({ invoices, bills });
    } catch (error) {
        console.error('Error fetching debug chat context:', error);
        res.status(500).json({ error: 'Failed to fetch debug data', details: error.message });
    }
}));

// Debug endpoint to check DB record counts
router.get('/db-check/:id', asyncHandler(async (req, res) => {
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
router.get('/get-log', (req, res) => {
    fs.readFile('server.log', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading log file:', err);
            return res.status(500).send('Error reading log file');
        }
        res.send(data);
    });
});

module.exports = router;
