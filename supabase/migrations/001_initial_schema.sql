-- CRÉATION AUTOMATIQUE DES TABLES
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id TEXT UNIQUE NOT NULL,
    phone_number TEXT NOT NULL,
    customer_name TEXT,
    city TEXT,
    address TEXT,
    transcript TEXT,
    summary TEXT,
    recording_url TEXT,
    priorite TEXT,
    service_type TEXT,
    source TEXT,
    price_estimate INTEGER,
    is_business_hours BOOLEAN,
    call_duration INTEGER,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id TEXT REFERENCES leads(call_id),
    to_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    to_email TEXT NOT NULL,
    cc_email TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_leads_priorite ON leads(priorite);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
