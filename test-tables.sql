-- Test pour vérifier que les tables existent
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

-- Compter les lignes dans chaque table
SELECT 'leads' as table_name, COUNT(*) as row_count FROM leads
UNION ALL
SELECT 'sms_logs', COUNT(*) FROM sms_logs
UNION ALL
SELECT 'email_queue', COUNT(*) FROM email_queue;

-- Vérifier les colonnes de la table leads
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'leads'
ORDER BY 
    ordinal_position;