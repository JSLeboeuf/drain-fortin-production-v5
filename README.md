# Drain Fortin - Système Paul V5 Production

## Configuration Active

### Webhook Supabase
- **URL**: `https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook`
- **Status**: ✅ Déployé et actif
- **Sécurité**: HMAC activée

### Assistant VAPI
- **ID**: `88e33137-f408-49ae-91cf-1606d107945a`
- **Nom**: Paul V5 - Assistant Drain Fortin
- **Numéro**: 438-900-4385

### Mode Test
- **Maxime**: 450-280-3222
- **Guillaume**: 450-280-3222

## Déploiement

### 1. Tables SQL
```bash
# Dans Supabase SQL Editor
# Exécuter: supabase/migrations/001_initial_schema.sql
```

### 2. Webhook
```bash
npx supabase functions deploy vapi-webhook --project-ref phiduqxcufdmgjvdipyu
```

### 3. Assistant VAPI
```bash
# Importer dans VAPI Dashboard
# Fichier: vapi/assistant-config.json
```

## Test
```
Appeler: 438-900-4385
Dire: "J'ai un drain bouché"
```

## Variables d'environnement
```env
TWILIO_ACCOUNT_SID=AC_YOUR_ACCOUNT_SID_HERE
TWILIO_AUTH_TOKEN=c67cb4b19f46a9a8db815c0d6781c0f9
VAPI_API_KEY=a9734091-6a88-4d18-992d-03d7731f7517
VAPI_WEBHOOK_SECRET=b3ecb907827db6ae5d82afff34fa112d5a1e759bca11997e2ca584068b79da7f
```