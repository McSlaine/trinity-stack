const { pool } = require('../db');
const { makeMyobApiRequest } = require('./myob');

async function syncCompanyData(companyId) {
    console.log(`[${companyId}] --- Starting Full Data Sync ---`);
    const client = await pool.connect();
    let overallStatus = 'Completed';

    try {
        await client.query('BEGIN');
        await client.query(
            `INSERT INTO sync_progress (company_file_id, status, processed_items, total_items)
             VALUES ($1, 'Starting', 0, 0)
             ON CONFLICT (company_file_id)
             DO UPDATE SET status = 'Starting', processed_items = 0, total_items = 0, details = NULL`,
            [companyId]
        );

        const syncSteps = [
            {
                name: 'Accounts',
                endpoint: '/GeneralLedger/Account',
                action: async (item) => {
                    await client.query(`INSERT INTO accounts (uid, company_file_id, name, display_id, type, classification, current_balance, raw_data)
                                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                                        ON CONFLICT (uid) DO UPDATE SET name = $3, display_id = $4, type = $5, classification = $6, current_balance = $7, raw_data = $8`,
                                        [item.UID, companyId, item.Name, item.DisplayID, item.Type, item.Classification, item.CurrentBalance, item]);
                }
            },
            {
                name: 'Invoices',
                endpoint: '/Sale/Invoice?$filter=Status eq \'Open\' or Status eq \'Closed\'',
                action: async (item) => {
                    await client.query(`INSERT INTO invoices (uid, company_file_id, number, date, customer_name, balance_due_amount, status, due_date, total_amount, raw_data)
                                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                                        ON CONFLICT (uid) DO UPDATE SET number = $3, date = $4, customer_name = $5, balance_due_amount = $6, status = $7, due_date = $8, total_amount = $9, raw_data = $10`,
                                        [item.UID, companyId, item.Number, item.Date, item.Customer?.Name, item.BalanceDueAmount, item.Status, item.Terms?.DueDate, item.TotalAmount, item]);
                }
            },
            {
                name: 'Bills',
                endpoint: '/Purchase/Bill?$filter=Status eq \'Open\' or Status eq \'Closed\'',
                action: async (item) => {
                    await client.query(`INSERT INTO bills (uid, company_file_id, number, date, supplier_name, balance_due_amount, status, due_date, total_amount, raw_data)
                                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                                        ON CONFLICT (uid) DO UPDATE SET number = $3, date = $4, supplier_name = $5, balance_due_amount = $6, status = $7, due_date = $8, total_amount = $9, raw_data = $10`,
                                        [item.UID, companyId, item.Number, item.Date, item.Supplier?.Name, item.BalanceDueAmount, item.Status, item.Terms?.DueDate, item.TotalAmount, item]);
                }
            },
            {
                name: 'Customers',
                endpoint: '/Contact/Customer',
                action: async (item) => {
                    await client.query(`INSERT INTO customers (uid, company_file_id, name, raw_data)
                                        VALUES ($1, $2, $3, $4)
                                        ON CONFLICT (uid) DO UPDATE SET name = $3, raw_data = $4`,
                                        [item.UID, companyId, item.CompanyName || item.LastName, item]);
                }
            },
            {
                name: 'Suppliers',
                endpoint: '/Contact/Supplier',
                action: async (item) => {
                    await client.query(`INSERT INTO suppliers (uid, company_file_id, name, raw_data)
                                        VALUES ($1, $2, $3, $4)
                                        ON CONFLICT (uid) DO UPDATE SET name = $3, raw_data = $4`,
                                        [item.UID, companyId, item.CompanyName || item.LastName, item]);
                }
            }
        ];

        for (const step of syncSteps) {
            try {
                const response = await makeMyobApiRequest(`https://api.myob.com/accountright/${companyId}${step.endpoint}`);
                const items = response.Items || [];
                console.log(`[${companyId}] Fetched ${items.length} ${step.name}.`);
                await client.query(
                    'UPDATE sync_progress SET status = $1, processed_items = $2, total_items = $3, details = NULL WHERE company_file_id = $4',
                    [`Syncing ${step.name}`, 0, items.length, companyId]
                );
                for (let i = 0; i < items.length; i++) {
                    await step.action(items[i]);
                    await client.query(
                        'UPDATE sync_progress SET processed_items = $1 WHERE company_file_id = $2',
                        [i + 1, companyId]
                    );
                }
            } catch (e) {
                const errorDetail = `Error syncing ${step.name}: ${e.message}`;
                console.error(`[${companyId}] ${errorDetail}`);
                overallStatus = 'Completed with errors';
                await client.query(
                    'UPDATE sync_progress SET status = $1, details = $2 WHERE company_file_id = $3',
                    [overallStatus, errorDetail, companyId]
                );
            }
        }
        
        await client.query('UPDATE sync_progress SET status = $1, details = CASE WHEN $1 = \'Completed\' THEN NULL ELSE details END WHERE company_file_id = $2', [overallStatus, companyId]);
        await client.query('UPDATE company_files SET last_sync_status = $1, last_sync_timestamp = NOW() WHERE id = $2', [overallStatus, companyId]);
        await client.query('COMMIT');
        console.log(`[${companyId}] --- Sync Finished with status: ${overallStatus} ---`);

    } catch (error) {
        await client.query('ROLLBACK');
        const criticalError = `CRITICAL SYNC ERROR: ${error.message}`;
        console.error(`[${companyId}] ${criticalError}`);
        try {
            await pool.query('UPDATE sync_progress SET status = $1, details = $2 WHERE company_file_id = $3', ['Failed', criticalError, companyId]);
            await pool.query('UPDATE company_files SET last_sync_status = $1 WHERE id = $2', ['Failed', companyId]);
        } catch (dbError) {
            console.error(`[${companyId}] Failed to write sync failure status to DB:`, dbError.message);
        }
    } finally {
        client.release();
    }
}

module.exports = { syncCompanyData };