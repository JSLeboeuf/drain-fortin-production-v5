-- CRÉATION AUTOMATIQUE DES TABLES - VERSION CORRIGÉE
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
    lead_id UUID REFERENCES leads(id),
    call_id TEXT,
    to_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id),
    to_email TEXT NOT NULL,
    cc_email TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_leads_call_id ON leads(call_id);
CREATE INDEX IF NOT EXISTS idx_leads_priorite ON leads(priorite);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_lead_id ON sms_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_lead_id ON email_queue(lead_id);