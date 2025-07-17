const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const tokenStore = require('../tokenStore');
const axios = require('axios');
const { MYOB_CLIENT_ID } = process.env;
const { query } = require('../db');
const myobAdapter = require('../myobAdapter');
const vector = require('../vector');
const { requireSessionAuth } = require('../middleware/sessionAuth');
const { ensureFreshToken } = require('../middleware/tokenRefresh');

// Require session authentication for all sync routes
router.use(requireSessionAuth);
// Ensure MYOB token is fresh
router.use(ensureFreshToken);

// Get sync status for a specific company
router.get('/status/:companyFileId', asyncHandler(async (req, res) => {
    const { companyFileId } = req.params;
    
    try {
        const { rows } = await query(
            'SELECT * FROM sync_progress WHERE company_file_id = $1',
            [companyFileId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                error: 'No sync progress found',
                status: 'idle',
                processed_items: 0,
                total_items: 0,
                details: 'No sync in progress'
            });
        }

        const progress = rows[0];
        
        // Calculate percentage
        const percentage = progress.total_items > 0 
            ? Math.round((progress.processed_items / progress.total_items) * 100)
            : 0;

        res.json({
            status: progress.status,
            processed_items: progress.processed_items || 0,
            total_items: progress.total_items || 0,
            percentage,
            details: progress.details || 'Processing...',
            last_updated: progress.last_updated,
            error: progress.status === 'Failed' ? progress.details : null
        });

    } catch (error) {
        console.error('Error fetching sync status:', error);
        res.status(500).json({ 
            error: 'Failed to fetch sync status',
            status: 'error',
            details: error.message 
        });
    }
}));

// Original route - kept for backward compatibility
router.post('/', asyncHandler(async (req, res, next) => {
  console.log('--- SYNC INITIATED ---');

  const { companyFileId, startDate, endDate } = req.body;
  console.log(' Received payload:', { companyFileId, startDate, endDate });

  const tokenData = await tokenStore.getToken();
  console.log(' Token Data:', tokenData);

  if (!tokenData?.access_token) {
    console.error('❌ No valid access token.');
    return res.status(401).json({ error: 'Unauthorized - no token' });
  }

  try {
    const url = `https://api.myob.com/accountright/${companyFileId}/GeneralLedger/JournalTransaction`;

    console.log(' Requesting MYOB:', url);
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'x-myobapi-key': MYOB_CLIENT_ID,
        'x-myobapi-version': 'v2',
        'x-myobapi-cftoken': tokenData.cftoken || '',
      },
      params: {
        DateFrom: startDate,
        DateTo: endDate,
      },
    });

    console.log('✅ MYOB Response Received:', response.data.length);
    res.json({ message: 'Sync successful', records: response.data });

  } catch (err) {
    console.error(' MYOB Sync Error:', err.response?.data || err.message);
    next(err);
  }
}));

// New route that accepts company ID as URL parameter
router.post('/:companyFileId', asyncHandler(async (req, res, next) => {
  console.log('--- SYNC INITIATED (with URL param) ---');

  const { companyFileId } = req.params;
  const { startDate, endDate, historicalYears } = req.body;
  console.log(' Received data:', { companyFileId, startDate, endDate, historicalYears });

  const tokenData = await tokenStore.getToken();
  console.log(' Token Data:', tokenData);

  if (!tokenData?.access_token) {
    console.error('❌ No valid access token.');
    return res.status(401).json({ error: 'Unauthorized - no token' });
  }

  try {
    // Initialize sync progress
    await query(`
      INSERT INTO sync_progress (company_file_id, status, processed_items, total_items, details)
      VALUES ($1, 'In Progress', 0, 0, 'Starting sync...')
      ON CONFLICT (company_file_id) 
      DO UPDATE SET 
        status = 'In Progress',
        processed_items = 0,
        total_items = 0,
        details = 'Starting sync...',
        last_updated = CURRENT_TIMESTAMP
    `, [companyFileId]);

    // Update progress - fetching data
    await query(`
      UPDATE sync_progress 
      SET details = 'Fetching invoices and bills from MYOB...',
          last_updated = CURRENT_TIMESTAMP
      WHERE company_file_id = $1
    `, [companyFileId]);

    // Fetch bills and invoices using myobAdapter with date filtering
    console.log(`Fetching bills from MYOB (from ${startDate} to ${endDate})...`);
    const bills = await myobAdapter.fetchBills(companyFileId, startDate, endDate);

    console.log(`Fetching invoices from MYOB (from ${startDate} to ${endDate})...`);
    const invoices = await myobAdapter.fetchInvoices(companyFileId, startDate, endDate);

    const totalItems = bills.length + invoices.length;
    
    // Update progress with total items
    await query(`
      UPDATE sync_progress 
      SET total_items = $2,
          details = 'Processing and storing data...',
          last_updated = CURRENT_TIMESTAMP
      WHERE company_file_id = $1
    `, [companyFileId, totalItems]);

    let processed = 0;

    // Insert bills
    for (const bill of bills) {
      try {
        await query(`
          INSERT INTO bills (company_id, bill_uid, number, date_issued, due_date, amount, raw_data) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (bill_uid) 
          DO UPDATE SET amount = $6, raw_data = $7
        `, [
          companyFileId,
          bill.UID,
          bill.Number,
          bill.Date,
          bill.Date, // Using same date for due_date if not available
          bill.TotalAmount || 0,
          JSON.stringify(bill)
        ]);
        
        processed++;
        
        // Update progress every 10 items
        if (processed % 10 === 0) {
          await query(`
            UPDATE sync_progress 
            SET processed_items = $2,
                details = 'Processing bills... ($2/$3)',
                last_updated = CURRENT_TIMESTAMP
            WHERE company_file_id = $1
          `, [companyFileId, processed, totalItems]);
        }
      } catch (billError) {
        console.error(`Error inserting bill ${bill.UID}:`, billError);
      }
    }

    // Insert invoices
    for (const invoice of invoices) {
      try {
        await query(`
          INSERT INTO invoices (company_id, invoice_uid, number, date_issued, due_date, amount_total, amount_paid, status, raw_data) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (invoice_uid) 
          DO UPDATE SET amount_total = $6, amount_paid = $7, status = $8, raw_data = $9
        `, [
          companyFileId,
          invoice.UID,
          invoice.Number,
          invoice.Date,
          invoice.Date, // Using same date for due_date if not available
          invoice.TotalAmount || 0,
          invoice.TotalPaid || 0,
          invoice.Status || 'Open',
          JSON.stringify(invoice)
        ]);
        
        processed++;
        
        // Update progress every 10 items
        if (processed % 10 === 0) {
          await query(`
            UPDATE sync_progress 
            SET processed_items = $2,
                details = 'Processing invoices... ($2/$3)',
                last_updated = CURRENT_TIMESTAMP
            WHERE company_file_id = $1
          `, [companyFileId, processed, totalItems]);
        }
      } catch (invoiceError) {
        console.error(`Error inserting invoice ${invoice.UID}:`, invoiceError);
      }
    }

    // Final progress update
    await query(`
      UPDATE sync_progress 
      SET processed_items = $2,
          status = 'Completed',
          details = 'Sync completed successfully',
          last_updated = CURRENT_TIMESTAMP
      WHERE company_file_id = $1
    `, [companyFileId, processed]);

    console.log(`✅ Sync completed: ${processed} items processed`);
    res.json({ 
      message: 'Sync completed successfully', 
      itemsProcessed: processed,
      bills: bills.length,
      invoices: invoices.length
    });

  } catch (err) {
    console.error('❌ Sync Error:', err.response?.data || err.message);
    
    // Update progress with error
    await query(`
      UPDATE sync_progress 
      SET status = 'Failed',
          details = $2,
          last_updated = CURRENT_TIMESTAMP
      WHERE company_file_id = $1
    `, [companyFileId, err.message]);
    
    next(err);
  }
}));

module.exports = router;
