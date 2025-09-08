#!/usr/bin/env node

const https = require('https');

console.log('🧪 Test du système Paul V5\n');

// Test 1: Webhook
console.log('1. Test webhook Supabase...');
https.get('https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook', (res) => {
  if (res.statusCode === 401) {
    console.log('   ✅ Webhook actif (sécurité HMAC activée)');
  } else {
    console.log('   ❌ Problème webhook');
  }
});

// Test 2: VAPI
console.log('2. Test configuration VAPI...');
const options = {
  hostname: 'api.vapi.ai',
  path: '/assistant',
  headers: {
    'Authorization': 'Bearer a9734091-6a88-4d18-992d-03d7731f7517'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const assistants = JSON.parse(data);
      const paul = assistants.find(a => a.id === '88e33137-f408-49ae-91cf-1606d107945a');
      if (paul) {
        console.log('   ✅ Assistant Paul V5 configuré');
      } else {
        console.log('   ⚠️ Assistant non trouvé');
      }
    } catch (e) {
      console.log('   ❌ Erreur VAPI');
    }
  });
});

setTimeout(() => {
  console.log('\n📞 Test: Appeler 438-900-4385');
}, 2000);