require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const companyId = 'comp-xyz-123'; // The sample company ID from companies.json

async function seedDatabase() {
    const client = await pool.connect();
    try {
        console.log('Starting database seeding...');
        await client.query('BEGIN');

        // Clean up previous sample data for this company
        console.log('Deleting old sample data...');
        await client.query('DELETE FROM invoices WHERE company_id = $1', [companyId]);
        await client.query('DELETE FROM bills WHERE company_id = $1', [companyId]);
        await client.query('DELETE FROM accounts WHERE company_id = $1', [companyId]);

        // Seed Invoices
        console.log('Seeding invoices...');
        await client.query(
            `INSERT INTO invoices (company_id, invoice_uid, number, date_issued, due_date, total_amount, balance_due_amount, status) VALUES
             ($1, 'inv-001', 'INV-001', '2024-07-01', '2024-07-31', 5000.00, 5000.00, 'Open'),
             ($1, 'inv-002', 'INV-002', '2024-06-15', '2024-07-15', 2500.00, 0.00, 'Paid'),
             ($1, 'inv-003', 'INV-003', '2024-05-20', '2024-06-20', 1000.00, 1000.00, 'Open')`, // Overdue
            [companyId]
        );

        // Seed Bills
        console.log('Seeding bills...');
        await client.query(
            `INSERT INTO bills (company_id, bill_uid, number, date_issued, due_date, total_amount, balance_due_amount, status) VALUES
             ($1, 'bill-001', 'BILL-001', '2024-07-05', '2024-08-04', 1200.00, 1200.00, 'Open'),
             ($1, 'bill-002', 'BILL-002', '2024-06-20', '2024-07-20', 750.50, 0.00, 'Paid'),
             ($1, 'bill-003', 'BILL-003', '2024-05-10', '2024-06-10', 300.00, 300.00, 'Open')`, // Overdue
            [companyId]
        );

        // Seed Accounts
        console.log('Seeding accounts...');
        await client.query(
            `INSERT INTO accounts (company_id, name, type, current_balance, classification) VALUES
             ($1, 'Business Bank Account', 'Bank', 25000.75, 'Asset'),
             ($1, 'Business Credit Card', 'CreditCard', -4500.50, 'Liability'),
             ($1, 'GST Collected', 'OtherLiability', 1500.00, 'Liability'),
             ($1, 'GST Paid', 'OtherLiability', -500.00, 'Liability')`,
            [companyId]
        );

        await client.query('COMMIT');
        console.log('Database seeding completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error seeding database:', error);
    } finally {
        client.release();
        pool.end();
    }
}

seedDatabase();
