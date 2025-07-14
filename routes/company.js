const express = require('express');
const { pool } = require('../db');
const { makeMyobApiRequest } = require('../lib/myob');
const asyncHandler = require('../middleware/asyncHandler');
const { requireToken } = require('../middleware/tokenValidation');
const querystring = require('querystring');

const router = express.Router();

// All routes in this file require a valid token
router.use(requireToken);

// Get all company files
router.get('/files', asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT id, name, uri, country, last_sync_status, last_sync_timestamp FROM company_files');
    if (rows.length > 0) {
        return res.json(rows);
    }

    const data = await makeMyobApiRequest('https://api.myob.com/accountright/');
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const file of data) {
            await client.query(
                'INSERT INTO company_files (id, name, uri, country) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = $2, uri = $3, country = $4',
                [file.Id, file.Name, file.Uri, file.Country]
            );
        }
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
    
    const { rows: finalRows } = await pool.query('SELECT id, name, uri, country, last_sync_status, last_sync_timestamp FROM company_files');
    res.json(finalRows);
}));

// Get details for a specific company file
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM company_files WHERE id = $1', [id]);
    if (rows.length === 0) {
        const data = await makeMyobApiRequest('https://api.myob.com/accountright/');
        const companyFile = data.find(f => f.Id === id);
        if (!companyFile) {
            return res.status(404).json({ error: 'Company file not found' });
        }
        await pool.query(
            'INSERT INTO company_files (id, name, uri, country) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = $2, uri = $3, country = $4',
            [companyFile.Id, companyFile.Name, companyFile.Uri, companyFile.Country]
        );
        const { rows: finalRows } = await pool.query('SELECT * FROM company_files WHERE id = $1', [id]);
        return res.json(finalRows[0]);
    }
    res.json(rows[0]);
}));

// Get dashboard summary
router.get('/:id/dashboard-summary', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const fyStartYear = currentMonth >= 6 ? currentYear : currentYear - 1;
        const fyStartDate = new Date(fyStartYear, 6, 1);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);

        const queries = {
            overdueInvoices: `SELECT COUNT(*)::int as count, SUM(balance_due_amount) as total FROM invoices WHERE company_file_id = $1 AND status = 'Open' AND balance_due_amount > 0 AND due_date < NOW()`,
            overdueBills: `SELECT COUNT(*)::int as count, SUM(balance_due_amount) as total FROM bills WHERE company_file_id = $1 AND status = 'Open' AND balance_due_amount > 0 AND due_date < NOW()`,
            income3m: `SELECT SUM(total_amount) as total FROM invoices WHERE company_file_id = $1 AND date >= $2`,
            expenses3m: `SELECT SUM(total_amount) as total FROM bills WHERE company_file_id = $1 AND date >= $2`,
            incomeFy: `SELECT SUM(total_amount) as total FROM invoices WHERE company_file_id = $1 AND date >= $2`,
            expensesFy: `SELECT SUM(total_amount) as total FROM bills WHERE company_file_id = $1 AND date >= $2`,
            bankAccounts: `SELECT name, current_balance FROM accounts WHERE company_file_id = $1 AND type = 'Bank' ORDER BY name`,
            gst: `SELECT SUM(CASE WHEN name ILIKE '%collected%' THEN current_balance ELSE 0 END) as collected, SUM(CASE WHEN name ILIKE '%paid%' THEN current_balance ELSE 0 END) as paid FROM accounts WHERE company_file_id = $1 AND classification = 'Liability' AND name ILIKE '%gst%'`
        };

        const [
            overdueInvoicesRes,
            overdueBillsRes,
            income3mRes,
            expenses3mRes,
            incomeFyRes,
            expensesFyRes,
            bankAccountsRes,
            gstRes
        ] = await Promise.all([
            client.query(queries.overdueInvoices, [id]),
            client.query(queries.overdueBills, [id]),
            client.query(queries.income3m, [id, threeMonthsAgo]),
            client.query(queries.expenses3m, [id, threeMonthsAgo]),
            client.query(queries.incomeFy, [id, fyStartDate]),
            client.query(queries.expensesFy, [id, fyStartDate]),
            client.query(queries.bankAccounts, [id]),
            client.query(queries.gst, [id])
        ]);

        const incomeFy = parseFloat(incomeFyRes.rows[0]?.total) || 0;
        const expensesFy = parseFloat(expensesFyRes.rows[0]?.total) || 0;
        const gstCollected = parseFloat(gstRes.rows[0]?.collected) || 0;
        const gstPaidRaw = parseFloat(gstRes.rows[0]?.paid) || 0;
        const gstPaidForDisplay = Math.abs(gstPaidRaw);
        const gstToPay = gstCollected - gstPaidForDisplay;

        res.json({
            overdue_invoices: {
                count: parseInt(overdueInvoicesRes.rows[0]?.count) || 0,
                total: parseFloat(overdueInvoicesRes.rows[0]?.total) || 0
            },
            overdue_bills: {
                count: parseInt(overdueBillsRes.rows[0]?.count) || 0,
                total: parseFloat(overdueBillsRes.rows[0]?.total) || 0
            },
            income_3m: { total: parseFloat(income3mRes.rows[0]?.total) || 0 },
            expenses_3m: { total: parseFloat(expenses3mRes.rows[0]?.total) || 0 },
            financial_position: { income: incomeFy, expenses: expensesFy, net_profit: incomeFy - expensesFy },
            bank_accounts: bankAccountsRes.rows,
            gst: {
                collected: gstCollected,
                paid: gstPaidForDisplay,
                to_pay: gstToPay
            },
        });
    } catch (error) {
        console.error(`[${id}] Error in /dashboard-summary:`, error);
        res.status(500).json({ error: 'Failed to fetch dashboard summary', details: error.message });
    } finally {
        client.release();
    }
}));

// Get P&L report
router.get('/:id/profit-and-loss', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT raw_data FROM profit_and_loss_reports WHERE company_file_id = $1 ORDER BY report_year DESC, report_month DESC LIMIT 1', [id]);
    if (rows.length === 0) {
        return res.json({});
    }
    res.json(rows[0].raw_data);
}));

// Generic resource fetcher
router.get('/:id/resource/:resource(*)', asyncHandler(async (req, res) => {
    const { id, resource } = req.params;
    const allowed = ['Sale/Invoice', 'Purchase/Bill', 'Contact/Customer', 'Contact/Supplier'];
    if (!allowed.some((prefix) => resource.startsWith(prefix))) {
      return res.status(403).json({ error: 'Resource not allowed' });
    }
    const query = querystring.stringify(req.query);
    const resourceUri = `https://api.myob.com/accountright/${id}/${resource}?${query}`;
    const data = await makeMyobApiRequest(resourceUri);
    res.json(data);
}));

module.exports = router;
