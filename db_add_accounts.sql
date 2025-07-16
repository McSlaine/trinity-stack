-- Create the accounts table
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    company_id TEXT REFERENCES company_files(myob_uid) ON DELETE CASCADE,
    name TEXT,
    type TEXT,
    current_balance NUMERIC(12, 2),
    classification TEXT
);

-- Create profit_and_loss_reports table
CREATE TABLE profit_and_loss_reports (
    id SERIAL PRIMARY KEY,
    company_id TEXT REFERENCES company_files(myob_uid) ON DELETE CASCADE,
    report_year INT,
    report_month INT,
    raw_data JSONB
);

-- Add balance_due_amount to invoices and bills
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_due_amount NUMERIC(12, 2);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS balance_due_amount NUMERIC(12, 2);

-- Add total_amount to invoices and bills
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2);
