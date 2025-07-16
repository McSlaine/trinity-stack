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
    console.log(`Fetched ${bills.length} bills`);

    console.log(`Fetching invoices from MYOB (from ${startDate} to ${endDate})...`);
    const invoices = await myobAdapter.fetchInvoices(companyFileId, startDate, endDate);
    console.log(`Fetched ${invoices.length} invoices`);

    const itemsToSync = [...bills, ...invoices];
    const totalItems = itemsToSync.length;

    // Update total items count
    await query(`
      UPDATE sync_progress 
      SET total_items = $2,
          details = 'Processing and vectorizing data...',
          last_updated = CURRENT_TIMESTAMP
      WHERE company_file_id = $1
    `, [companyFileId, totalItems]);

    // Process each item and push to vector DB
    let processedCount = 0;
    let vectorsInserted = 0;

    for (const item of itemsToSync) {
      try {
        // Create descriptive text for the vector embedding
        const original_text = `${item.type || 'Unknown'} ${item.Number || ''} for ${item.Customer?.CompanyName || item.Supplier?.CompanyName || 'Unknown'} - ${item.Description || ''} of ${item.TotalAmount || item.Amount || 0} due on ${item.DueDate || 'Unknown'}`;

        const metadata = {
          id: item.UID,
          type: item.type || (item.Customer ? 'invoice' : 'bill'),
          date: item.Date || item.DateOccurred,
          dueDate: item.DueDate,
          amount: item.TotalAmount || item.Amount || 0,
          status: item.Status || 'unknown',
          original_text: original_text,
          number: item.Number,
          companyFileId: companyFileId
        };

        // Push to Pinecone
        await vector.pushToVectorDB(original_text, metadata);
        vectorsInserted++;
        console.log(`Pushed ${metadata.type} ${item.UID} to Pinecone`);
      } catch (err) {
        console.error(`Failed to vectorize item ${item.UID}:`, err);
      }

      processedCount++;

      // Update progress every 10 items or on last item
      if (processedCount % 10 === 0 || processedCount === totalItems) {
        await query(`
          UPDATE sync_progress 
          SET processed_items = $2,
              last_updated = CURRENT_TIMESTAMP
          WHERE company_file_id = $1
        `, [companyFileId, processedCount]);
      }
    }

    // Log sync completion
    await query(`
      INSERT INTO sync_log (company_id, success, message, vectors_inserted)
      VALUES ($1, true, $2, $3)
    `, [companyFileId, `Sync completed successfully. Processed ${processedCount} items.`, vectorsInserted]);

    // Update sync progress to completed
    await query(`
      UPDATE sync_progress 
      SET status = 'Completed',
          processed_items = $2,
          total_items = $2,
          details = $3,
          last_updated = CURRENT_TIMESTAMP
      WHERE company_file_id = $1
    `, [companyFileId, processedCount, `Sync completed. ${vectorsInserted} vectors created.`]);

    res.json({ 
      message: 'Sync successful', 
      totalItems: totalItems,
      processedItems: processedCount,
      vectorsInserted: vectorsInserted
    });

  } catch (err) {
    console.error(' MYOB Sync Error:', err.response?.data || err.message);
    
    // Log sync error
    await query(`
      INSERT INTO sync_log (company_id, success, message, error_details)
      VALUES ($1, false, 'Sync failed', $2)
    `, [companyFileId, err.message]);
    
    // Update sync progress to failed
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

// Get sync status endpoint
router.get('/status/:companyFileId', asyncHandler(async (req, res) => {
  const { companyFileId } = req.params;
  
  try {
    const result = await query(
      'SELECT * FROM sync_progress WHERE company_file_id = $1',
      [companyFileId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sync status not found for this company' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching sync status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

module.exports = router;
