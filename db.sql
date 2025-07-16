-- Schema for Cashflow Trends AI PostgreSQL Database

CREATE TABLE company_files (
    myob_uid TEXT PRIMARY KEY,
    name TEXT,
    uri TEXT,
    country TEXT,
    last_synced TIMESTAMP,
    error_msg TEXT,
    last_sync_status TEXT,
    last_sync_timestamp TIMESTAMP
);

CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    company_id TEXT REFERENCES company_files(myob_uid) ON DELETE CASCADE,
    invoice_uid TEXT UNIQUE NOT NULL,
    number TEXT,
    date_issued DATE,
    due_date DATE,
    amount_total NUMERIC(12, 2),
    amount_paid NUMERIC(12, 2),
    status TEXT,
    raw_data JSONB
);

CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    company_id TEXT REFERENCES company_files(myob_uid) ON DELETE CASCADE,
    bill_uid TEXT UNIQUE NOT NULL,
    number TEXT,
    date_issued DATE,
    due_date DATE,
    amount NUMERIC(12, 2),
    paid BOOLEAN DEFAULT false,
    raw_data JSONB
);

CREATE TABLE gst_activity (
    id SERIAL PRIMARY KEY,
    company_id TEXT REFERENCES company_files(myob_uid) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    gst_paid NUMERIC(12, 2),
    gst_collected NUMERIC(12, 2),
    UNIQUE(company_id, period_start, period_end)
);

CREATE TABLE sync_log (
    id SERIAL PRIMARY KEY,
    company_id TEXT REFERENCES company_files(myob_uid) ON DELETE CASCADE,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL,
    message TEXT,
    error_details TEXT,
    vectors_inserted INT DEFAULT 0 -- Added for vector count logging
);

-- Add indexes for faster lookups
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_bills_company_id ON bills(company_id);
CREATE INDEX idx_gst_activity_company_id ON gst_activity(company_id);
CREATE INDEX idx_sync_log_company_id ON sync_log(company_id);

CREATE TABLE sync_progress (
    id SERIAL PRIMARY KEY,
    company_file_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL,
    processed_items INT DEFAULT 0,
    total_items INT DEFAULT 0,
    details TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
