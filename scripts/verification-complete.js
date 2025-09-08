#!/usr/bin/env node

/**
 * Script de vérification complète du système Drain Fortin
 * Exécute toutes les vérifications et génère un rapport de statut
 */

const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const VAPI_API_KEY = 'a9734091-6a88-4d18-992d-03d7731f7517';
const ASSISTANT_ID = '90395b6a-5b14-4515-a7b8-1149db5787bc';
const WEBHOOK_URL = 'https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook';
const PHONE_NUMBER = '+14389004385';

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
function header(msg) { console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(50)}\n${msg}\n${'='.repeat(50)}${colors.reset}\n`); }

// Fonction pour tester une URL
function testUrl(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = https.request(options, (res) => {
      resolve({ status: res.statusCode, message: res.statusMessage });
    });
    
    req.on('error', (err) => {
      resolve({ status: 0, message: err.message });
    });
    
    req.write(JSON.stringify({ test: 'ping' }));
    req.end();
  });
}

// Fonction pour vérifier VAPI
function checkVapi() {
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
          const data = JSON.parse(body);
          resolve({ success: true, data });
        } catch (e) {
          resolve({ success: false, error: e.message });
        }
      });
    });
    
    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    
    req.end();
  });
}

// Vérification principale
async function main() {
  const report = {
    timestamp: new Date().toISOString(),
    checks: [],
    summary: { passed: 0, failed: 0, warnings: 0 }
  };
  
  header('VÉRIFICATION COMPLÈTE DU SYSTÈME DRAIN FORTIN');
  console.log(`Date: ${new Date().toLocaleString('fr-CA')}\n`);
  
  // 1. Vérifier les fichiers locaux
  header('1. VÉRIFICATION DES FICHIERS');
  const requiredFiles = [
    '.env.example',
    'package.json',
    'README.md',
    'supabase/functions/vapi-webhook/index.ts',
    'supabase/migrations/001_initial_schema.sql',
    'vapi/assistant-config.json',
    'scripts/deploy.sh',
    'scripts/test.js',
    'dashboard/dashboard.html'
  ];
  
  let allFilesExist = true;
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      success(`Fichier trouvé: ${file}`);
      report.checks.push({ name: `File: ${file}`, status: 'passed' });
      report.summary.passed++;
    } else {
      error(`Fichier manquant: ${file}`);
      report.checks.push({ name: `File: ${file}`, status: 'failed' });
      report.summary.failed++;
      allFilesExist = false;
    }
  }
  
  // 2. Vérifier le webhook Supabase
  header('2. VÉRIFICATION DU WEBHOOK SUPABASE');
  const webhookTest = await testUrl(WEBHOOK_URL);
  
  if (webhookTest.status === 401) {
    success(`Webhook actif (401 = sécurité HMAC activée)`);
    info(`URL: ${WEBHOOK_URL}`);
    report.checks.push({ name: 'Webhook Supabase', status: 'passed' });
    report.summary.passed++;
  } else if (webhookTest.status > 0) {
    warning(`Webhook répond avec status ${webhookTest.status}`);
    report.checks.push({ name: 'Webhook Supabase', status: 'warning', details: `Status ${webhookTest.status}` });
    report.summary.warnings++;
  } else {
    error(`Webhook inaccessible: ${webhookTest.message}`);
    report.checks.push({ name: 'Webhook Supabase', status: 'failed' });
    report.summary.failed++;
  }
  
  // 3. Vérifier l'assistant VAPI
  header('3. VÉRIFICATION DE L\'ASSISTANT VAPI');
  const vapiCheck = await checkVapi();
  
  if (vapiCheck.success && vapiCheck.data) {
    const assistant = vapiCheck.data;
    success(`Assistant trouvé: ${assistant.name}`);
    info(`ID: ${assistant.id}`);
    info(`Webhook configuré: ${assistant.serverUrl}`);
    
    // Vérifier les règles d'affaires
    const prompt = assistant.model?.messages?.[0]?.content || '';
    const rules = [
      { name: 'Prix minimum 350$', pattern: /350\$|350 \$/ },
      { name: 'Maxime configuré', pattern: /Maxime|514-617-5425|450-280-3222/ },
      { name: 'Guillaume configuré', pattern: /Guillaume|450-280-3222/ },
      { name: 'Services refusés', pattern: /vacuum|fosse|gouttière/ },
      { name: 'Surcharge Rive-Sud', pattern: /Rive-Sud|\+100\$|100\$/ },
      { name: 'Question source', pattern: /Comment avez-vous/ },
      { name: 'Loi 25', pattern: /Loi 25/ }
    ];
    
    console.log('\n📋 Règles d\'affaires:');
    let allRulesPass = true;
    for (const rule of rules) {
      if (prompt.match(rule.pattern)) {
        success(`  ${rule.name}`);
        report.checks.push({ name: rule.name, status: 'passed' });
        report.summary.passed++;
      } else {
        error(`  ${rule.name} - MANQUANT`);
        report.checks.push({ name: rule.name, status: 'failed' });
        report.summary.failed++;
        allRulesPass = false;
      }
    }
    
    if (!allRulesPass) {
      warning('\nCertaines règles manquent dans l\'assistant');
    }
  } else {
    error(`Assistant non accessible: ${vapiCheck.error}`);
    report.checks.push({ name: 'Assistant VAPI', status: 'failed' });
    report.summary.failed++;
  }
  
  // 4. Vérifier Git
  header('4. VÉRIFICATION GIT');
  try {
    const gitRemote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    success(`Repository configuré: ${gitRemote}`);
    
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    if (gitStatus) {
      warning('Modifications non commitées détectées');
      report.checks.push({ name: 'Git Status', status: 'warning' });
      report.summary.warnings++;
    } else {
      success('Workspace Git propre');
      report.checks.push({ name: 'Git Status', status: 'passed' });
      report.summary.passed++;
    }
  } catch (e) {
    error(`Erreur Git: ${e.message}`);
    report.checks.push({ name: 'Git', status: 'failed' });
    report.summary.failed++;
  }
  
  // 5. Actions manuelles requises
  header('5. ACTIONS MANUELLES REQUISES');
  
  const manualSteps = [
    {
      name: 'Variables Supabase',
      description: 'Configurer TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, VAPI_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY',
      url: 'https://app.supabase.com/project/phiduqxcufdmgjvdipyu/settings/functions'
    },
    {
      name: 'Tables SQL',
      description: 'Exécuter supabase/migrations/001_initial_schema.sql',
      url: 'https://app.supabase.com/project/phiduqxcufdmgjvdipyu/sql/new'
    },
    {
      name: 'Service Role Key',
      description: 'Récupérer et configurer la clé service_role',
      url: 'https://app.supabase.com/project/phiduqxcufdmgjvdipyu/settings/api'
    }
  ];
  
  for (const step of manualSteps) {
    warning(`${step.name}`);
    console.log(`   📝 ${step.description}`);
    console.log(`   🔗 ${step.url}\n`);
    report.checks.push({ name: step.name, status: 'manual_required' });
  }
  
  // Rapport final
  header('RAPPORT FINAL');
  
  const totalChecks = report.summary.passed + report.summary.failed + report.summary.warnings;
  const completionRate = Math.round((report.summary.passed / totalChecks) * 100);
  
  console.log(`✅ Tests réussis: ${report.summary.passed}`);
  console.log(`❌ Tests échoués: ${report.summary.failed}`);
  console.log(`⚠️  Avertissements: ${report.summary.warnings}`);
  console.log(`\n📊 Taux de complétion: ${completionRate}%`);
  
  // Sauvegarder le rapport
  const reportFile = `verification-report-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  info(`\nRapport sauvegardé: ${reportFile}`);
  
  // Statut final
  console.log('\n' + '='.repeat(50));
  if (report.summary.failed === 0 && report.summary.warnings === 0) {
    success('🎉 SYSTÈME 100% PRÊT (après configuration manuelle)');
  } else if (report.summary.failed === 0) {
    warning('⚠️  SYSTÈME FONCTIONNEL AVEC AVERTISSEMENTS');
  } else {
    error('❌ CONFIGURATION INCOMPLÈTE - ACTIONS REQUISES');
  }
  console.log('='.repeat(50) + '\n');
  
  // Instructions finales
  console.log('📞 Pour tester après configuration:');
  console.log('   1. Appeler: 438-900-4385');
  console.log('   2. Dire: "J\'ai un drain bouché"');
  console.log('   3. Vérifier les logs Supabase\n');
}

// Exécuter
main().catch(console.error);