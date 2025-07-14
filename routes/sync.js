const express = require('express');
const { pool } = require('../db');
const { syncCompanyData } = require('../lib/sync');
const asyncHandler = require('../middleware/asyncHandler');
const { requireToken } = require('../middleware/tokenValidation');

const router = express.Router();

// All routes in this file require a valid token
router.use(requireToken);

// Start a new sync for a company file
router.post('/:companyId', asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    // Don't await this, let it run in the background
    syncCompanyData(companyId);
    res.status(202).json({ message: 'Sync started' });
}));

// Get the sync status for a company file
router.get('/status/:companyId', asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { rows } = await pool.query('SELECT * FROM sync_progress WHERE company_file_id = $1', [companyId]);
    if (rows.length === 0) {
        return res.json({ status: 'Not Started', processed_items: 0, total_items: 0 });
    }
    res.json(rows[0]);
}));

module.exports = router;
