#!/bin/bash

echo "🚀 Déploiement Drain Fortin Paul V5"
echo "===================================="

# 1. Deploy Supabase webhook
echo "📦 Déploiement du webhook..."
npx supabase functions deploy vapi-webhook --project-ref phiduqxcufdmgjvdipyu

# 2. Test webhook
echo "🧪 Test du webhook..."
curl -I https://phiduqxcufdmgjvdipyu.supabase.co/functions/v1/vapi-webhook

echo ""
echo "✅ Déploiement complété!"
echo ""
echo "Prochaines étapes:"
echo "1. Créer les tables SQL dans Supabase"
echo "2. Importer l'assistant dans VAPI Dashboard"
echo "3. Assigner le numéro 438-900-4385"
echo ""
echo "Test: Appeler 438-900-4385"