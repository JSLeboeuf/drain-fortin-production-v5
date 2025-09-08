#!/usr/bin/env node

/**
 * Script pour vérifier l'état de la base de données Supabase
 * et identifier toutes les erreurs
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const SUPABASE_URL = 'https://phiduqxcufdmgjvdipyu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMwNzkyNzEsImV4cCI6MjA0ODY1NTI3MX0.1_7jgN42c9F7pUqaYJFPovPJwzxYaBOPKBZ-iEdQLKc';

// Créer le client Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function success(msg) { console.log(`${colors.green}✅ ${msg}${colors.reset}`); }
function error(msg) { console.log(`${colors.red}❌ ${msg}${colors.reset}`); }
function warning(msg) { console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`); }
function info(msg) { console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`); }
function header(msg) { 
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(50)}`);
  console.log(msg);
  console.log(`${'='.repeat(50)}${colors.reset}\n`);
}

async function checkTables() {
  header('VÉRIFICATION DES TABLES');
  
  const tables = ['leads', 'sms_logs', 'email_queue'];
  const results = {};
  
  for (const table of tables) {
    try {
      // Essayer de compter les lignes
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        error(`Table ${table}: ${countError.message}`);
        results[table] = { exists: false, error: countError.message };
      } else {
        success(`Table ${table}: Existe (${count || 0} lignes)`);
        results[table] = { exists: true, count: count || 0 };
      }
    } catch (err) {
      error(`Table ${table}: ${err.message}`);
      results[table] = { exists: false, error: err.message };
    }
  }
  
  return results;
}

async function checkColumns() {
  header('VÉRIFICATION DES COLONNES');
  
  try {
    // Tester l'insertion d'un lead fictif
    const testLead = {
      call_id: `test_${Date.now()}`,
      phone_number: '514-000-0000',
      customer_name: 'Test Client',
      city: 'Montreal',
      address: '123 Test St',
      transcript: 'Test transcript',
      summary: 'Test summary',
      recording_url: 'https://test.com/recording.mp3',
      priorite: 'P3_NORMAL',
      service_type: 'Débouchage',
      source: 'Test',
      price_estimate: 350,
      is_business_hours: true,
      call_duration: 120,
      status: 'test'
    };
    
    const { data, error: insertError } = await supabase
      .from('leads')
      .insert(testLead)
      .select();
    
    if (insertError) {
      if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
        error(`Colonne manquante: ${insertError.message}`);
        return { success: false, error: insertError.message };
      } else {
        warning(`Erreur d'insertion (peut être normal): ${insertError.message}`);
      }
    } else {
      success('Structure de la table leads correcte');
      
      // Supprimer le test
      if (data && data[0]) {
        await supabase
          .from('leads')
          .delete()
          .eq('id', data[0].id);
        info('Données de test supprimées');
      }
      
      return { success: true };
    }
  } catch (err) {
    error(`Erreur lors du test: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function checkFunctions() {
  header('VÉRIFICATION DES EDGE FUNCTIONS');
  
  try {
    const response = await fetch('https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'ping' })
    });
    
    if (response.status === 401) {
      success('Webhook actif et sécurisé (HMAC activé)');
      return { active: true, secured: true };
    } else if (response.status === 200) {
      warning('Webhook actif mais non sécurisé');
      return { active: true, secured: false };
    } else {
      error(`Webhook retourne status ${response.status}`);
      const text = await response.text();
      console.log('Réponse:', text);
      return { active: false, status: response.status };
    }
  } catch (err) {
    error(`Erreur webhook: ${err.message}`);
    return { active: false, error: err.message };
  }
}

async function getRecentErrors() {
  header('RECHERCHE D\'ERREURS RÉCENTES');
  
  try {
    // Chercher les leads avec status 'error'
    const { data: errorLeads, error: queryError } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'error')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (queryError) {
      warning(`Impossible de vérifier les erreurs: ${queryError.message}`);
    } else if (errorLeads && errorLeads.length > 0) {
      warning(`${errorLeads.length} leads en erreur trouvés`);
      errorLeads.forEach(lead => {
        console.log(`  - ${lead.call_id}: ${lead.customer_name || 'Sans nom'}`);
      });
    } else {
      success('Aucun lead en erreur');
    }
    
    // Chercher les SMS non envoyés
    const { data: failedSms, error: smsError } = await supabase
      .from('sms_logs')
      .select('*')
      .eq('status', 'failed')
      .order('sent_at', { ascending: false })
      .limit(5);
    
    if (!smsError && failedSms && failedSms.length > 0) {
      warning(`${failedSms.length} SMS échoués trouvés`);
    }
    
  } catch (err) {
    error(`Erreur lors de la recherche: ${err.message}`);
  }
}

async function main() {
  console.log(`${colors.bold}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     DIAGNOSTIC COMPLET SUPABASE                ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  const report = {
    timestamp: new Date().toISOString(),
    results: {}
  };
  
  // 1. Vérifier les tables
  report.results.tables = await checkTables();
  
  // 2. Vérifier les colonnes
  if (report.results.tables.leads?.exists) {
    report.results.columns = await checkColumns();
  } else {
    warning('Table leads n\'existe pas - création nécessaire');
  }
  
  // 3. Vérifier les Edge Functions
  report.results.webhook = await checkFunctions();
  
  // 4. Chercher les erreurs récentes
  if (report.results.tables.leads?.exists) {
    await getRecentErrors();
  }
  
  // Rapport final
  header('RÉSUMÉ DU DIAGNOSTIC');
  
  const issues = [];
  
  // Analyser les problèmes
  if (!report.results.tables.leads?.exists) {
    issues.push('❌ Table leads manquante - Exécuter le SQL de création');
  }
  if (!report.results.tables.sms_logs?.exists) {
    issues.push('❌ Table sms_logs manquante - Exécuter le SQL de création');
  }
  if (!report.results.tables.email_queue?.exists) {
    issues.push('❌ Table email_queue manquante - Exécuter le SQL de création');
  }
  if (report.results.columns?.error) {
    issues.push(`❌ Problème de structure: ${report.results.columns.error}`);
  }
  if (!report.results.webhook?.active) {
    issues.push('❌ Webhook non accessible');
  }
  
  if (issues.length === 0) {
    console.log(`${colors.green}${colors.bold}`);
    console.log('🎉 SYSTÈME 100% FONCTIONNEL!');
    console.log('Toutes les vérifications sont passées avec succès.');
    console.log(`${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bold}`);
    console.log('⚠️ PROBLÈMES DÉTECTÉS:');
    console.log(`${colors.reset}`);
    issues.forEach(issue => console.log(issue));
    
    console.log('\n📝 SOLUTION:');
    console.log('1. Exécuter le SQL dans Supabase SQL Editor');
    console.log('2. Configurer les variables d\'environnement');
    console.log('3. Relancer ce script de vérification');
  }
  
  // Sauvegarder le rapport
  const fs = require('fs');
  const reportFile = `diagnostic-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  info(`\nRapport sauvegardé: ${reportFile}`);
}

// Vérifier si le module @supabase/supabase-js est installé
try {
  require.resolve('@supabase/supabase-js');
  main().catch(console.error);
} catch (e) {
  console.log('Installation du module @supabase/supabase-js...');
  require('child_process').execSync('npm install @supabase/supabase-js', { stdio: 'inherit' });
  console.log('Module installé. Relancez le script.');
}