#!/usr/bin/env node

/**
 * Script pour configurer automatiquement les variables Supabase
 * REQUIERT: Le service role key de Supabase
 */

const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Secrets à configurer (voir SECRETS.md pour les vraies valeurs)
const SECRETS = {
  TWILIO_ACCOUNT_SID: '{{TWILIO_ACCOUNT_SID_FROM_SECRETS_MD}}',
  TWILIO_AUTH_TOKEN: '{{TWILIO_AUTH_TOKEN_FROM_SECRETS_MD}}',
  VAPI_WEBHOOK_SECRET: '{{VAPI_WEBHOOK_SECRET_FROM_SECRETS_MD}}'
};

console.log('');
console.log('===========================================');
console.log('  Configuration Automatique Supabase');
console.log('===========================================');
console.log('');
console.log('⚠️ PRÉREQUIS:');
console.log('1. Récupérer le service_role key depuis:');
console.log('   https://app.supabase.com/project/phiduqxcufdmgjvdipyu/settings/api');
console.log('');

rl.question('Entrez le SUPABASE_SERVICE_ROLE_KEY: ', (serviceKey) => {
  if (!serviceKey || !serviceKey.startsWith('eyJ')) {
    console.error('❌ Clé invalide!');
    process.exit(1);
  }

  console.log('');
  console.log('📝 Configuration des variables d\'environnement...');
  console.log('');
  console.log('Variables à ajouter manuellement dans Supabase Dashboard:');
  console.log('https://app.supabase.com/project/phiduqxcufdmgjvdipyu/settings/functions');
  console.log('');
  
  // Afficher les variables à copier
  console.log('```');
  Object.entries(SECRETS).forEach(([key, value]) => {
    console.log(`${key}=${value}`);
  });
  console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`);
  console.log('```');
  
  console.log('');
  console.log('✅ Copiez ces variables dans Supabase Edge Functions Settings');
  console.log('');
  
  // Créer le SQL
  console.log('📊 SQL à exécuter dans Supabase SQL Editor:');
  console.log('https://app.supabase.com/project/phiduqxcufdmgjvdipyu/sql/new');
  console.log('');
  console.log('Fichier: supabase/migrations/001_initial_schema.sql');
  console.log('');
  
  // Test de connexion
  console.log('🧪 Pour tester après configuration:');
  console.log('1. Appeler: 438-900-4385');
  console.log('2. Dire: "J\'ai un drain bouché"');
  console.log('');
  
  rl.close();
});