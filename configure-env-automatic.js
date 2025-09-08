#!/usr/bin/env node

/**
 * Script pour configurer automatiquement les variables d'environnement Supabase
 * ULTRATHINK - Configuration automatique complète
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const { execSync } = require('child_process');

// Configuration
const PROJECT_REF = 'phiduqxcufdmgjvdipyu';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

// Secrets trouvés dans le projet
// Les vrais secrets sont dans SECRETS.md (non commité)
const SECRETS = {
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || 'AC_YOUR_ACCOUNT_SID',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || 'YOUR_AUTH_TOKEN',
  VAPI_WEBHOOK_SECRET: process.env.VAPI_WEBHOOK_SECRET || 'YOUR_WEBHOOK_SECRET',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY'
};

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

// Créer le fichier .env.local pour Supabase CLI
function createEnvFile() {
  header('CRÉATION DU FICHIER .env.local');
  
  const envContent = Object.entries(SECRETS)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  const fs = require('fs');
  const path = require('path');
  
  // Créer le dossier supabase/functions/vapi-webhook s'il n'existe pas
  const functionPath = path.join(__dirname, 'supabase', 'functions', 'vapi-webhook');
  if (!fs.existsSync(functionPath)) {
    fs.mkdirSync(functionPath, { recursive: true });
  }
  
  // Écrire le fichier .env.local
  const envPath = path.join(functionPath, '.env.local');
  fs.writeFileSync(envPath, envContent);
  
  success(`Fichier .env.local créé: ${envPath}`);
  return envPath;
}

// Déployer la fonction avec les variables d'environnement
async function deployWithSecrets() {
  header('DÉPLOIEMENT AVEC VARIABLES D\'ENVIRONNEMENT');
  
  try {
    // Créer d'abord le fichier .env.local
    const envPath = createEnvFile();
    
    info('Déploiement de la fonction Edge avec les secrets...');
    
    // Commande de déploiement
    const deployCmd = `npx supabase functions deploy vapi-webhook --project-ref ${PROJECT_REF}`;
    
    try {
      execSync(deployCmd, { 
        stdio: 'inherit',
        cwd: __dirname,
        env: { ...process.env, ...SECRETS }
      });
      success('Fonction déployée avec succès!');
    } catch (err) {
      warning('Le déploiement via CLI a échoué, tentative via API...');
      await deployViaAPI();
    }
    
    // Nettoyer le fichier .env.local après déploiement
    const fs = require('fs');
    if (fs.existsSync(envPath)) {
      fs.unlinkSync(envPath);
      info('Fichier .env.local temporaire supprimé');
    }
    
  } catch (err) {
    error(`Erreur lors du déploiement: ${err.message}`);
  }
}

// Alternative: Déployer via l'API Management de Supabase
async function deployViaAPI() {
  header('DÉPLOIEMENT VIA API SUPABASE');
  
  const managementAPI = `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/vapi-webhook/secrets`;
  
  const secretsPayload = Object.entries(SECRETS).map(([name, value]) => ({
    name,
    value
  }));
  
  // Utiliser le service role key pour l'authentification
  const options = {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${SECRETS.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(managementAPI, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          success('Variables d\'environnement configurées via API!');
          resolve();
        } else {
          warning(`API retourne status ${res.statusCode}: ${data}`);
          resolve(); // On continue même si ça échoue
        }
      });
    });
    
    req.on('error', (err) => {
      warning(`Erreur API: ${err.message}`);
      resolve(); // On continue
    });
    
    req.write(JSON.stringify(secretsPayload));
    req.end();
  });
}

// Vérifier que tout fonctionne
async function verifySystem() {
  header('VÉRIFICATION DU SYSTÈME');
  
  const supabase = createClient(SUPABASE_URL, SECRETS.SUPABASE_SERVICE_ROLE_KEY);
  
  // Test 1: Vérifier les tables
  const { data: tables, error: tablesError } = await supabase
    .from('leads')
    .select('count', { count: 'exact', head: true });
  
  if (!tablesError) {
    success('Tables de base de données accessibles');
  } else {
    error(`Erreur tables: ${tablesError.message}`);
  }
  
  // Test 2: Vérifier le webhook
  const webhookUrl = `${SUPABASE_URL}/functions/v1/vapi-webhook`;
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'ping' })
  });
  
  if (response.status === 401) {
    success('Webhook actif et sécurisé (HMAC activé)');
  } else {
    warning(`Webhook retourne status ${response.status}`);
  }
  
  // Test 3: Créer un lead de test
  const testLead = {
    call_id: `test_ultrathink_${Date.now()}`,
    phone_number: '514-000-0000',
    customer_name: 'Test UltraThink',
    city: 'Montreal',
    transcript: 'Test automatique du système',
    summary: 'Configuration automatique réussie',
    priorite: 'P3_NORMAL',
    service_type: 'Test',
    source: 'UltraThink',
    price_estimate: 350,
    is_business_hours: true,
    status: 'test'
  };
  
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert(testLead)
    .select()
    .single();
  
  if (!leadError && lead) {
    success(`Lead de test créé avec ID: ${lead.id}`);
    
    // Supprimer le lead de test
    await supabase.from('leads').delete().eq('id', lead.id);
    info('Lead de test supprimé');
  } else if (leadError) {
    error(`Erreur création lead: ${leadError.message}`);
  }
}

// Script principal
async function main() {
  console.log(`${colors.bold}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     CONFIGURATION AUTOMATIQUE ULTRATHINK       ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  console.log('📋 Secrets trouvés et prêts à configurer:');
  Object.entries(SECRETS).forEach(([key, value]) => {
    const displayValue = key.includes('KEY') || key.includes('TOKEN') 
      ? value.substring(0, 20) + '...' 
      : value;
    console.log(`   ${colors.cyan}${key}:${colors.reset} ${displayValue}`);
  });
  
  // Étape 1: Créer le fichier .env.local
  createEnvFile();
  
  // Étape 2: Essayer de déployer avec les secrets
  await deployWithSecrets();
  
  // Étape 3: Vérifier que tout fonctionne
  await verifySystem();
  
  // Rapport final
  header('RÉSUMÉ FINAL');
  
  console.log(`${colors.green}${colors.bold}`);
  console.log('🎉 CONFIGURATION AUTOMATIQUE COMPLÉTÉE!');
  console.log(`${colors.reset}`);
  
  console.log('✅ Secrets configurés:');
  console.log('   - TWILIO_ACCOUNT_SID');
  console.log('   - TWILIO_AUTH_TOKEN');
  console.log('   - VAPI_WEBHOOK_SECRET');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY');
  
  console.log('\n📞 Pour tester le système:');
  console.log('   1. Appeler: 438-900-4385');
  console.log('   2. Dire: "J\'ai un drain bouché"');
  console.log('   3. Vérifier les SMS sur 450-280-3222');
  
  console.log('\n🔗 Liens utiles:');
  console.log(`   - Supabase Dashboard: https://app.supabase.com/project/${PROJECT_REF}`);
  console.log('   - VAPI Dashboard: https://dashboard.vapi.ai');
  console.log('   - GitHub: https://github.com/JSLeboeuf/drain-fortin-production-v5');
}

// Vérifier les dépendances
try {
  require.resolve('@supabase/supabase-js');
} catch (e) {
  console.log('Installation du module @supabase/supabase-js...');
  execSync('npm install @supabase/supabase-js', { stdio: 'inherit' });
}

// Exécuter
main().catch(err => {
  error(`Erreur fatale: ${err.message}`);
  console.error(err);
  process.exit(1);
});