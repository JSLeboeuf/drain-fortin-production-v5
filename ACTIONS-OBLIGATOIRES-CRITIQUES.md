# ⚠️ ACTIONS OBLIGATOIRES - LE SYSTÈME NE FONCTIONNE PAS SANS CES ÉTAPES

## 🔴 CRITIQUE: 4 ACTIONS MANUELLES REQUISES

### 1️⃣ CONFIGURER LES VARIABLES SUPABASE (5 minutes)

**URL**: https://app.supabase.com/project/phiduqxcufdmgjvdipyu/settings/functions

Ajouter ces variables d'environnement:
```
TWILIO_ACCOUNT_SID={{TWILIO_ACCOUNT_SID_FROM_SECRETS_MD}}
TWILIO_AUTH_TOKEN={{TWILIO_AUTH_TOKEN_FROM_SECRETS_MD}}
VAPI_WEBHOOK_SECRET=b3ecb907827db6ae5d82afff34fa112d5a1e759bca11997e2ca584068b79da7f
SUPABASE_SERVICE_ROLE_KEY=[À récupérer dans Settings → API]
```

⚠️ **Sans ces variables, le webhook échouera à 100%**

---

### 2️⃣ CRÉER LES TABLES SQL (2 minutes)

**URL**: https://app.supabase.com/project/phiduqxcufdmgjvdipyu/sql/new

1. Ouvrir l'éditeur SQL
2. Copier le contenu de `supabase/migrations/001_initial_schema.sql`
3. Cliquer "Run"

Tables à créer:
- `leads` - Pour stocker les appels
- `sms_logs` - Pour tracker les SMS
- `email_queue` - Pour les emails

⚠️ **Sans ces tables, les appels ne seront pas sauvegardés**

---

### 3️⃣ RÉCUPÉRER LE SERVICE ROLE KEY (1 minute)

**URL**: https://app.supabase.com/project/phiduqxcufdmgjvdipyu/settings/api

1. Copier la "service_role" key (commence par `eyJ...`)
2. L'ajouter dans les variables d'environnement (étape 1)

⚠️ **Sans cette clé, le webhook ne peut pas écrire dans la base de données**

---

### 4️⃣ METTRE À JOUR L'ASSISTANT VAPI (3 minutes)

**URL**: https://dashboard.vapi.ai/assistants

1. Trouver l'assistant ID: `88e33137-f408-49ae-91cf-1606d107945a`
2. Cliquer "Edit"
3. Vérifier que le webhook URL est: `https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook`
4. Vérifier que le prompt contient toutes les règles (Prix 350$, Maxime, Guillaume, etc.)
5. Sauvegarder

⚠️ **L'assistant actuel pourrait avoir un ancien prompt**

---

## ✅ VALIDATION APRÈS CONFIGURATION

### Test 1: Webhook
```bash
curl -X POST https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "ping"}'
```
Devrait retourner une erreur 401 (normal - sécurité HMAC)

### Test 2: Tables SQL
Dans Supabase SQL Editor:
```sql
SELECT * FROM leads LIMIT 1;
```
Ne devrait pas donner d'erreur

### Test 3: Appel réel
```
Appeler: 438-900-4385
Dire: "J'ai un drain bouché"
```

---

## 📊 STATUT ACTUEL

| Composant | Déployé | Configuré | Fonctionnel |
|-----------|---------|-----------|-------------|
| Webhook Supabase | ✅ | ❌ | ❌ |
| Tables SQL | ❌ | ❌ | ❌ |
| Variables d'env | ❌ | ❌ | ❌ |
| Assistant VAPI | ✅ | ⚠️ | ⚠️ |
| Numéro 438-900-4385 | ✅ | ✅ | ⚠️ |

---

## ⏱️ TEMPS TOTAL: 11 MINUTES

Une fois ces 4 actions complétées, le système sera 100% fonctionnel.

**IMPORTANT**: Ces étapes ne peuvent PAS être automatisées car elles nécessitent un accès direct aux dashboards Supabase et VAPI avec vos credentials.