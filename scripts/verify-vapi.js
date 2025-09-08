#!/usr/bin/env node

/**
 * Script pour vérifier la configuration VAPI
 */

const https = require('https');

const VAPI_API_KEY = 'a9734091-6a88-4d18-992d-03d7731f7517';
const ASSISTANT_ID = '88e33137-f408-49ae-91cf-1606d107945a';

function vapiRequest(method, endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vapi.ai',
      path: endpoint,
      method: method,
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
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('\n🔍 VÉRIFICATION DE L\'ASSISTANT VAPI\n');
  
  try {
    // Récupérer l'assistant spécifique
    const assistant = await vapiRequest('GET', `/assistant/${ASSISTANT_ID}`);
    
    if (assistant && assistant.id) {
      console.log('✅ Assistant trouvé:', assistant.name);
      console.log('   ID:', assistant.id);
      console.log('   Webhook:', assistant.serverUrl);
      
      // Vérifier les éléments critiques du prompt
      const prompt = assistant.model?.messages?.[0]?.content || '';
      
      console.log('\n📋 Vérification des règles d\'affaires:');
      
      const rules = [
        { name: 'Prix minimum 350$', pattern: /350\$|350 \$/ },
        { name: 'Maxime configuré', pattern: /Maxime|514-617-5425|450-280-3222/ },
        { name: 'Guillaume configuré', pattern: /Guillaume|450-280-3222/ },
        { name: 'Services refusés', pattern: /vacuum|fosse|gouttière/ },
        { name: 'Surcharge Rive-Sud', pattern: /Rive-Sud|\+100\$|100\$/ },
        { name: 'Question source', pattern: /Comment avez-vous/ },
        { name: 'Loi 25', pattern: /Loi 25/ }
      ];
      
      let allGood = true;
      rules.forEach(rule => {
        if (prompt.match(rule.pattern)) {
          console.log(`   ✅ ${rule.name}`);
        } else {
          console.log(`   ❌ ${rule.name} - MANQUANT!`);
          allGood = false;
        }
      });
      
      if (!allGood) {
        console.log('\n⚠️ ATTENTION: L\'assistant doit être mis à jour!');
        console.log('   Importer: vapi/assistant-config.json dans VAPI Dashboard');
      } else {
        console.log('\n✅ Toutes les règles sont configurées!');
      }
      
      // Vérifier le numéro
      console.log('\n📞 Vérification du numéro:');
      const numbers = await vapiRequest('GET', '/phone-number');
      const testNumber = numbers.find(n => 
        n.number === '+14389004385' || 
        n.assistantId === ASSISTANT_ID
      );
      
      if (testNumber) {
        console.log('   ✅ 438-900-4385 assigné à l\'assistant');
      } else {
        console.log('   ❌ Numéro non assigné!');
      }
      
    } else {
      console.log('❌ Assistant non trouvé!');
      console.log('   ID recherché:', ASSISTANT_ID);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
  
  console.log('\n📞 Pour tester: Appeler 438-900-4385');
}

main();