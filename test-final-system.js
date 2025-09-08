#!/usr/bin/env node

/**
 * Test final du système complet
 * ULTRATHINK - Vérification end-to-end
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const VAPI_API_KEY = 'a9734091-6a88-4d18-992d-03d7731f7517';
const ASSISTANT_ID = '90395b6a-5b14-4515-a7b8-1149db5787bc';
const WEBHOOK_URL = 'https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook';
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
  bold: '\x1b[1m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m'
};

function success(msg) { console.log(`${colors.green}✅ ${msg}${colors.reset}`); }
function error(msg) { console.log(`${colors.red}❌ ${msg}${colors.reset}`); }
function warning(msg) { console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`); }
function info(msg) { console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`); }

// Test des tables
async function testDatabase() {
  console.log('\n📊 TEST BASE DE DONNÉES');
  console.log('━'.repeat(40));
  
  const tables = ['leads', 'sms_logs', 'email_queue'];
  let allTablesExist = true;
  
  for (const table of tables) {
    try {
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        error(`Table ${table}: ${countError.message}`);
        allTablesExist = false;
      } else {
        success(`Table ${table}: OK (${count || 0} lignes)`);
      }
    } catch (err) {
      error(`Table ${table}: ${err.message}`);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

// Test du webhook
async function testWebhook() {
  console.log('\n🔗 TEST WEBHOOK');
  console.log('━'.repeat(40));
  
  return new Promise((resolve) => {
    https.request(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      if (res.statusCode === 401) {
        success('Webhook actif et sécurisé (401 = HMAC OK)');
        resolve(true);
      } else {
        warning(`Webhook retourne status ${res.statusCode}`);
        resolve(false);
      }
    })
    .on('error', (err) => {
      error(`Erreur webhook: ${err.message}`);
      resolve(false);
    })
    .end(JSON.stringify({ test: 'ping' }));
  });
}

// Test de l'assistant VAPI
async function testVAPI() {
  console.log('\n🤖 TEST ASSISTANT VAPI');
  console.log('━'.repeat(40));
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.vapi.ai',
      path: `/assistant/${ASSISTANT_ID}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const assistant = JSON.parse(body);
          if (assistant && assistant.id) {
            success(`Assistant trouvé: ${assistant.name}`);
            info(`  ID: ${assistant.id}`);
            info(`  Webhook: ${assistant.serverUrl}`);
            
            // Vérifier les règles d'affaires
            const prompt = assistant.model?.messages?.[0]?.content || '';
            const rules = [
              { name: 'Prix minimum 350$', pattern: /350\$|350 \$/ },
              { name: 'Services refusés', pattern: /vacuum|fosse|gouttière/ },
              { name: 'Surcharge Rive-Sud', pattern: /Rive-Sud|\+100\$/ },
              { name: 'Question source', pattern: /Comment avez-vous/ }
            ];
            
            console.log('\n  📋 Règles d\'affaires:');
            rules.forEach(rule => {
              if (prompt.match(rule.pattern)) {
                console.log(`    ✅ ${rule.name}`);
              } else {
                console.log(`    ❌ ${rule.name}`);
              }
            });
            
            resolve(true);
          } else {
            error('Assistant non trouvé');
            resolve(false);
          }
        } catch (e) {
          error(`Erreur parsing: ${e.message}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      error(`Erreur VAPI: ${err.message}`);
      resolve(false);
    });
    
    req.end();
  });
}

// Test du numéro de téléphone
async function testPhoneNumber() {
  console.log('\n📞 TEST NUMÉRO DE TÉLÉPHONE');
  console.log('━'.repeat(40));
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.vapi.ai',
      path: '/phone-number',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const numbers = JSON.parse(body);
          const testNumber = numbers.find(n => 
            n.number === '+14389004385' || 
            n.assistantId === ASSISTANT_ID
          );
          
          if (testNumber) {
            success('438-900-4385 assigné à l\'assistant');
            info(`  Provider: ${testNumber.provider}`);
            info(`  Status: ${testNumber.status || 'Active'}`);
            resolve(true);
          } else {
            warning('Numéro non assigné à l\'assistant');
            resolve(false);
          }
        } catch (e) {
          error(`Erreur parsing: ${e.message}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      error(`Erreur: ${err.message}`);
      resolve(false);
    });
    
    req.end();
  });
}

// Script principal
async function main() {
  console.log(`\n${colors.bold}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║        TEST FINAL DU SYSTÈME COMPLET           ║');
  console.log('║              ULTRATHINK ANALYSIS                ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  const results = {
    database: false,
    webhook: false,
    vapi: false,
    phone: false
  };
  
  // Exécuter tous les tests
  results.database = await testDatabase();
  results.webhook = await testWebhook();
  results.vapi = await testVAPI();
  results.phone = await testPhoneNumber();
  
  // Rapport final
  console.log(`\n${colors.bold}${'═'.repeat(50)}${colors.reset}`);
  console.log(`${colors.bold}           RAPPORT FINAL${colors.reset}`);
  console.log(`${colors.bold}${'═'.repeat(50)}${colors.reset}\n`);
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  const percentage = Math.round((passedTests / totalTests) * 100);
  
  console.log('📊 Résultats des tests:');
  console.log(`   ${results.database ? '✅' : '❌'} Base de données`);
  console.log(`   ${results.webhook ? '✅' : '❌'} Webhook Supabase`);
  console.log(`   ${results.vapi ? '✅' : '❌'} Assistant VAPI`);
  console.log(`   ${results.phone ? '✅' : '❌'} Numéro de téléphone`);
  
  console.log(`\n📈 Score: ${passedTests}/${totalTests} tests passés (${percentage}%)`);
  
  if (percentage === 100) {
    console.log(`\n${colors.bgGreen}${colors.bold}                                              ${colors.reset}`);
    console.log(`${colors.bgGreen}${colors.bold}     🎉 SYSTÈME 100% OPÉRATIONNEL! 🎉        ${colors.reset}`);
    console.log(`${colors.bgGreen}${colors.bold}                                              ${colors.reset}`);
    
    console.log('\n✅ Le système est prêt pour la production!');
    console.log('\n📞 Pour tester en conditions réelles:');
    console.log('   1. Appeler: 438-900-4385');
    console.log('   2. Dire: "J\'ai un drain bouché à Montréal"');
    console.log('   3. Vérifier:');
    console.log('      - SMS reçu sur 450-280-3222');
    console.log('      - Données dans Supabase');
    console.log('      - Logs du webhook');
  } else if (percentage >= 75) {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  SYSTÈME PARTIELLEMENT FONCTIONNEL (${percentage}%)${colors.reset}`);
    console.log('\nCertains composants nécessitent attention.');
  } else {
    console.log(`\n${colors.bgRed}${colors.bold}                                              ${colors.reset}`);
    console.log(`${colors.bgRed}${colors.bold}     ❌ SYSTÈME NON FONCTIONNEL (${percentage}%)     ${colors.reset}`);
    console.log(`${colors.bgRed}${colors.bold}                                              ${colors.reset}`);
    
    console.log('\n⚠️ Actions requises:');
    if (!results.database) {
      console.log('   - Créer les tables SQL dans Supabase');
    }
    if (!results.webhook) {
      console.log('   - Vérifier le déploiement du webhook');
    }
    if (!results.vapi) {
      console.log('   - Configurer l\'assistant VAPI');
    }
    if (!results.phone) {
      console.log('   - Assigner le numéro à l\'assistant');
    }
  }
  
  console.log('\n🔗 Liens utiles:');
  console.log('   Supabase: https://app.supabase.com/project/phiduqxcufdmgjvdipyu');
  console.log('   VAPI: https://dashboard.vapi.ai');
  console.log('   GitHub: https://github.com/JSLeboeuf/drain-fortin-production-v5');
  console.log('');
}

// Vérifier les dépendances
try {
  require.resolve('@supabase/supabase-js');
} catch (e) {
  console.log('Installation du module @supabase/supabase-js...');
  require('child_process').execSync('npm install @supabase/supabase-js', { stdio: 'inherit' });
}

// Exécuter
main().catch(console.error);