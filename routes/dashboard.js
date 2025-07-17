const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { query } = require('../db'); // Import the database query function

// Helper to format numbers as currency
const formatCurrency = (value) => {
    const number = Number(value);
    if (isNaN(number)) {
        return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(number);
};

/**
 * Fetches user and company data from the database.
 */
const fetchCompanyData = async (companyId) => {
    const { rows } = await query('SELECT name FROM company_files WHERE myob_uid = $1', [companyId]);
    if (rows.length === 0) {
        throw new Error('Company file not found.');
    }
    // In a real multi-user app, you'd fetch the actual user's name.
    // For now, we'll use a static name and the dynamic company name.
    return {
        userName: 'Valued Customer',
        companyName: rows[0].name,
    };
};

/**
 * Fetches and calculates financial data from the database.
 */
const fetchFinancialData = async (companyId) => {
    // KPI: Upcoming Bills (due in the next 30 days, not paid)
    const upcomingBillsResult = await query(
        `SELECT COALESCE(SUM(amount), 0) AS total 
         FROM bills 
         WHERE company_id = $1 AND paid = false AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30`,
        [companyId]
    );

    // KPI: Overdue Invoices (past due, not fully paid)
    const overdueInvoicesResult = await query(
        `SELECT COALESCE(SUM(amount_total - amount_paid), 0) AS total 
         FROM invoices 
         WHERE company_id = $1 AND status <> 'Closed' AND due_date < CURRENT_DATE`,
        [companyId]
    );
    
    // KPI: Net Cash Flow (Income from paid invoices - paid bills in last 30 days)
    const incomeResult = await query(
        `SELECT COALESCE(SUM(amount_paid), 0) as total 
         FROM invoices 
         WHERE company_id = $1 AND date_issued >= CURRENT_DATE - 30`,
        [companyId]
    );
    const expenseResult = await query(
        `SELECT COALESCE(SUM(amount), 0) as total 
         FROM bills 
         WHERE company_id = $1 AND paid = true AND date_issued >= CURRENT_DATE - 30`,
        [companyId]
    );
    const netCashFlow = incomeResult.rows[0].total - expenseResult.rows[0].total;

    // Chart: Monthly cashflow for the last 6 months
    const cashflowChartResult = await query(
        `SELECT 
            TO_CHAR(date_trunc('month', date_issued), 'YYYY-MM') AS month,
            COALESCE(SUM(amount_total), 0) AS income
         FROM invoices
         WHERE company_id = $1 AND date_issued >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
         GROUP BY month
         ORDER BY month`,
        [companyId]
    );

    // Chart: Expense breakdown by category (using bill number as a placeholder)
    const expensePieResult = await query(
        `SELECT number, SUM(amount) as total 
         FROM bills 
         WHERE company_id = $1 AND paid = true
         GROUP BY number 
         ORDER BY total DESC 
         LIMIT 5`,
        [companyId]
    );

    return {
        kpis: {
            "Net Cash Flow (30d)": formatCurrency(netCashFlow),
            "Upcoming Bills": formatCurrency(upcomingBillsResult.rows[0].total),
            "Overdue Invoices": formatCurrency(overdueInvoicesResult.rows[0].total),
            "Revenue (30d)": formatCurrency(incomeResult.rows[0].total)
        },
        chartData: {
            labels: cashflowChartResult.rows.map(r => r.month),
            cashflow: cashflowChartResult.rows.map(r => r.income),
            expenseCategories: expensePieResult.rows.map(r => r.number),
            expenseValues: expensePieResult.rows.map(r => r.total)
        },
        aiSuggestions: "Review your overdue invoices to improve cash flow. The data is now live from your database."
    };
};

/**
 * @route   GET /api/dashboard/data
 * @desc    Get all the data required for the main dashboard from the database
 * @access  Private
 */
router.get('/data', asyncHandler(async (req, res) => {
    // Use the companyId from the session, fallback to a default for testing if needed
    const companyId = req.session.companyFileId;
    if (!companyId) {
        return res.status(400).json({ error: 'No company file selected. Please select a company file first.' });
    }

    const companyData = await fetchCompanyData(companyId);
    const financialData = await fetchFinancialData(companyId);

    res.status(200).json({
        userName: companyData.userName,
        changesSummary: `Displaying live data for ${companyData.companyName}.`,
        kpis: financialData.kpis,
        labels: financialData.chartData.labels,
        cashflow: financialData.chartData.cashflow,
        expenseCategories: financialData.chartData.expenseCategories,
        expenseValues: financialData.chartData.expenseValues,
        aiSuggestions: financialData.aiSuggestions
    });
}));

module.exports = router;