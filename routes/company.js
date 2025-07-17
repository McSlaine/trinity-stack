const express = require('express');
const { query } = require('../db');
const { makeMyobApiRequest } = require('../lib/myob');
const asyncHandler = require('../middleware/asyncHandler');
const { requireToken } = require('../middleware/tokenValidation');
const { requireSessionAuth } = require('../middleware/sessionAuth');
const { NotFoundError, BadRequestError } = require('../lib/errors');
const querystring = require('querystring');

const router = express.Router();

// BYPASS ROUTE: Direct mock company files without authentication (for testing)
router.get('/files-mock', asyncHandler(async (req, res) => {
    console.log('🎯 MOCK BYPASS: Providing company files without authentication');
    
    // Create mock company file
    const mockCompanyFile = {
        myob_uid: 'mock-company-id-12345',
        name: 'HIT Equipment International Pty Ltd (Demo Mode)',
        uri: 'https://api.myob.com/accountright/mock-company-id-12345',
        country: 'Australia',
        last_sync_status: 'OAuth Bypass Mode',
        last_sync_timestamp: new Date().toISOString()
    };
    
    // Insert into database
    try {
        await query(
            'INSERT INTO company_files (myob_uid, name, uri, country, last_sync_status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (myob_uid) DO UPDATE SET name = $2, uri = $3, country = $4, last_sync_status = $5',
            [mockCompanyFile.myob_uid, mockCompanyFile.name, mockCompanyFile.uri, mockCompanyFile.country, mockCompanyFile.last_sync_status]
        );
        console.log('✅ Mock company file created/updated in database');
    } catch (error) {
        console.log('⚠️ Database insert failed, proceeding with direct response:', error.message);
    }
    
    res.json([mockCompanyFile]);
}));

// Use session auth for authenticated routes
router.use(requireSessionAuth);

// Get all company files
router.get('/files', asyncHandler(async (req, res, next) => {
    const { rows } = await query('SELECT myob_uid, name, uri, country, last_sync_status, last_sync_timestamp FROM company_files');
    if (rows.length > 0) {
        return res.json(rows);
    }

    // Check if using mock authentication (OAuth bypass mode)
    const token = await require('../tokenStore').getToken();
    if (token && token.access_token && token.access_token.startsWith('mock_access_token_')) {
        console.log('🔄 OAuth bypass mode - providing mock company files');
        
        // Create mock company file entry
        const mockCompanyFile = {
            myob_uid: 'mock-company-id-12345',
            name: 'HIT Equipment International Pty Ltd (Demo Mode)',
            uri: 'https://api.myob.com/accountright/mock-company-id-12345',
            country: 'Australia'
        };
        
        // Insert mock company file into database
        await query(
            'INSERT INTO company_files (myob_uid, name, uri, country, last_sync_status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (myob_uid) DO UPDATE SET name = $2, uri = $3, country = $4, last_sync_status = $5',
            [mockCompanyFile.myob_uid, mockCompanyFile.name, mockCompanyFile.uri, mockCompanyFile.country, 'OAuth Bypass Mode']
        );
        
        const { rows: finalRows } = await query('SELECT myob_uid, name, uri, country, last_sync_status, last_sync_timestamp FROM company_files');
        return res.json(finalRows);
    }

    const data = await makeMyobApiRequest('https://api.myob.com/accountright/');
    
    if (!data || data.length === 0) {
        return next(new NotFoundError('No company files found from MYOB.'));
    }

    for (const file of data) {
        await query(
            'INSERT INTO company_files (myob_uid, name, uri, country) VALUES ($1, $2, $3, $4) ON CONFLICT (myob_uid) DO UPDATE SET name = $2, uri = $3, country = $4',
            [file.Id, file.Name, file.Uri, file.Country]
        );
    }
    
    const { rows: finalRows } = await query('SELECT myob_uid, name, uri, country, last_sync_status, last_sync_timestamp FROM company_files');
    res.json(finalRows);
}));

// Get details for a specific company file
router.get('/:id', asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { rows } = await query('SELECT * FROM company_files WHERE myob_uid = $1', [id]);
    if (rows.length > 0) {
        return res.json(rows[0]);
    }

    const data = await makeMyobApiRequest('https://api.myob.com/accountright/');
    const companyFile = data.find(f => f.Id === id);
    
    if (!companyFile) {
        return next(new NotFoundError('Company file not found.'));
    }

    await query(
        'INSERT INTO company_files (myob_uid, name, uri, country) VALUES ($1, $2, $3, $4) ON CONFLICT (myob_uid) DO UPDATE SET name = $2, uri = $3, country = $4',
        [companyFile.Id, companyFile.Name, companyFile.Uri, companyFile.Country]
    );
    const { rows: finalRows } = await query('SELECT * FROM company_files WHERE myob_uid = $1', [id]);
    res.json(finalRows[0]);
}));


// Get dashboard summary
router.get('/:id/dashboard-summary', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const fyStartYear = currentMonth >= 6 ? currentYear : currentYear - 1;
    const fyStartDate = new Date(fyStartYear, 6, 1);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    const queries = {
        overdueInvoices: `SELECT COUNT(*)::int as count, COALESCE(SUM(COALESCE(balance_due_amount, amount_total - amount_paid)), 0) as total FROM invoices WHERE company_id = $1 AND due_date < NOW() AND COALESCE(balance_due_amount, amount_total - amount_paid) > 0`,
        overdueBills: `SELECT COUNT(*)::int as count, COALESCE(SUM(COALESCE(balance_due_amount, amount)), 0) as total FROM bills WHERE company_id = $1 AND due_date < NOW()`,
        income3m: `SELECT COALESCE(SUM(amount_total), 0) as total FROM invoices WHERE company_id = $1 AND date_issued >= $2`,
        expenses3m: `SELECT COALESCE(SUM(amount), 0) as total FROM bills WHERE company_id = $1 AND date_issued >= $2`,
        incomeFy: `SELECT COALESCE(SUM(amount_total), 0) as total FROM invoices WHERE company_id = $1 AND date_issued >= $2`,
        expensesFy: `SELECT COALESCE(SUM(amount), 0) as total FROM bills WHERE company_id = $1 AND date_issued >= $2`,
        bankAccounts: `SELECT 'Main Account' as name, 0::numeric as current_balance WHERE $1 = $1`, // Placeholder query, accounts table not yet implemented
        gst: `SELECT COALESCE(SUM(gst_collected), 0) as collected, COALESCE(SUM(gst_paid), 0) as paid, COALESCE(SUM(gst_collected) - SUM(gst_paid), 0) as to_pay FROM gst_activity WHERE company_id = $1`
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
        query(queries.overdueInvoices, [id]),
        query(queries.overdueBills, [id]),
        query(queries.income3m, [id, threeMonthsAgo]),
        query(queries.expenses3m, [id, threeMonthsAgo]),
        query(queries.incomeFy, [id, fyStartDate]),
        query(queries.expensesFy, [id, fyStartDate]),
        query(queries.bankAccounts, [id]),
        query(queries.gst, [id])
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
}));

// Get P&L report
router.get('/:id/profit-and-loss', asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { rows } = await query('SELECT raw_data FROM profit_and_loss_reports WHERE company_file_id = $1 ORDER BY report_year DESC, report_month DESC LIMIT 1', [id]);
    if (rows.length === 0) {
        return next(new NotFoundError('Profit and Loss report not found. Please sync first.'));
    }
    res.json(rows[0].raw_data);
}));

// Generic resource fetcher
router.get('/:id/resource/:resource(*)', asyncHandler(async (req, res, next) => {
    const { id, resource } = req.params;
    const allowed = ['Sale/Invoice', 'Purchase/Bill', 'Contact/Customer', 'Contact/Supplier'];
    if (!allowed.some((prefix) => resource.startsWith(prefix))) {
      return next(new BadRequestError('Resource not allowed', 403));
    }
    const queryString = querystring.stringify(req.query);
    const resourceUri = `https://api.myob.com/accountright/${id}/${resource}?${queryString}`;
    const data = await makeMyobApiRequest(resourceUri);
    res.json(data);
}));

module.exports = router;
