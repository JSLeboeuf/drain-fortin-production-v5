-- NETTOYAGE (au cas où les tables existent déjà)
DROP TABLE IF EXISTS email_queue CASCADE;
DROP TABLE IF EXISTS sms_logs CASCADE;
DROP TABLE IF EXISTS leads CASCADE;

-- CRÉATION DE LA TABLE PRINCIPALE LEADS
CREATE TABLE leads (
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

-- CRÉATION DE LA TABLE SMS_LOGS
CREATE TABLE sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    call_id TEXT,
    to_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRÉATION DE LA TABLE EMAIL_QUEUE
CREATE TABLE email_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    to_email TEXT NOT NULL,
    cc_email TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- CRÉATION DES INDEX POUR OPTIMISER LES PERFORMANCES
CREATE INDEX idx_leads_call_id ON leads(call_id);
CREATE INDEX idx_leads_phone_number ON leads(phone_number);
CREATE INDEX idx_leads_priorite ON leads(priorite);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_city ON leads(city);

CREATE INDEX idx_sms_logs_lead_id ON sms_logs(lead_id);
CREATE INDEX idx_sms_logs_call_id ON sms_logs(call_id);
CREATE INDEX idx_sms_logs_status ON sms_logs(status);

CREATE INDEX idx_email_queue_lead_id ON email_queue(lead_id);
CREATE INDEX idx_email_queue_status ON email_queue(status);

-- FONCTION POUR METTRE À JOUR updated_at AUTOMATIQUEMENT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- TRIGGER POUR LA TABLE LEADS
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- VÉRIFICATION DE LA CRÉATION
SELECT 
    table_name,
    COUNT(*) as column_count
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name IN ('leads', 'sms_logs', 'email_queue')
GROUP BY 
    table_name
ORDER BY 
    table_name;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Tables créées avec succès:';
    RAISE NOTICE '- leads (avec colonne call_id)';
    RAISE NOTICE '- sms_logs';
    RAISE NOTICE '- email_queue';
    RAISE NOTICE 'Tous les index ont été créés';
END $$;