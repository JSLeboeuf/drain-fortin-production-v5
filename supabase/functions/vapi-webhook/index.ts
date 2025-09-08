// Supabase Edge Function - VAPI Webhook Handler V5 FINAL
// Drain Fortin - Configuration Complète Guillaume

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-vapi-signature',
}

// Configuration
const VAPI_WEBHOOK_SECRET = Deno.env.get('VAPI_WEBHOOK_SECRET') || 'b3ecb907827db6ae5d82afff34fa112d5a1e759bca11997e2ca584068b79da7f'
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') || '+14389004385'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://phiduqxcufdmgjvdipyu.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Contacts spéciaux V5 - TEST MODE avec 450-280-3222
const MAXIME_PHONE = '+14502803222' // TEST: Votre numéro pour tests Maxime
const GUILLAUME_PHONE = '+14502803222' // TEST: Votre numéro pour tests Guillaume

// Business Rules V5
const BUSINESS_HOURS = { start: 6, end: 15 } // 06:00 - 15:00
const MINIMUM_PRICE = 350
const RIVESUD_SURCHARGE = 100

// Zones Rive-Sud
const RIVESUD_ZONES = [
  'brossard', 'longueuil', 'saint-lambert', 'candiac', 'la prairie',
  'boucherville', 'chambly', 'saint-bruno', 'saint-hubert',
  'varennes', 'verchères', 'beloeil', 'saint-constant', 'delson',
  'sainte-catherine', 'saint-philippe', 'laprairie'
]

// Services refusés V5
const REFUSED_SERVICES = [
  'vacuum', 'aspiration', 'aspirateur central', 'aspirateur',
  'fosses septiques', 'fosse septique',
  'piscine', 'piscines',
  'gouttière', 'gouttières',
  'bac', 'pit', 'fosse de garage', 'pit de garage',
  'champ d\'épuration', 'champ epuration'
]

// Tarification V5
const PRICE_RANGES = {
  'débouchage': { min: 350, max: 650 },
  'inspection': { min: 350, max: 750 },
  'racines': { min: 450, max: 750 },
  'alésage': { min: 450, max: 750 },
  'drain_francais': { base: 500, forfait_cheminee: 2500 },
  'drain_toit': { min: 450 },
  'gps': { addon: 50, standalone: 400 },
  'gainage_inspection': { min: 350, max: 750 }
}

// Priority determination V5
function determinePriority(transcript: string, customerInfo: any): string {
  const lowerTranscript = transcript.toLowerCase()
  const customerName = customerInfo?.name?.toLowerCase() || ''
  
  // P1 - Urgence absolue
  if (lowerTranscript.includes('inondation') || 
      lowerTranscript.includes('urgence') ||
      lowerTranscript.includes('débordement') ||
      lowerTranscript.includes('eau partout') ||
      lowerTranscript.includes('dégât d\'eau')) {
    return 'P1_URGENCE'
  }
  
  // P2 - Municipal/Commercial
  if (lowerTranscript.includes('ville') || 
      lowerTranscript.includes('municipal') ||
      lowerTranscript.includes('inspection') ||
      lowerTranscript.includes('commercial') ||
      lowerTranscript.includes('entreprise')) {
    return 'P2_MUNICIPAL'
  }
  
  // P3 - Gainage/Racines (retour <1h promis)
  if (lowerTranscript.includes('gainage') || 
      lowerTranscript.includes('racine') ||
      lowerTranscript.includes('alésage') ||
      lowerTranscript.includes('réparation sans excavation')) {
    return 'P3_GAINAGE'
  }
  
  // P4 - Standard
  return 'P4_STANDARD'
}

// SMS sending function
async function sendSMS(to: string, body: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: TWILIO_PHONE_NUMBER,
          Body: body,
        }),
      }
    )

    if (response.ok) {
      console.log(`SMS sent to ${to}`)
      return true
    } else {
      console.error(`Failed to send SMS: ${response.status}`)
      return false
    }
  } catch (error) {
    console.error('SMS error:', error)
    return false
  }
}

// Email function for CRM
async function sendEmailNotification(leadData: any) {
  const emailContent = {
    to: 'estimation@drainfortin.ca',
    cc: 'guillaume@drainfortin.ca,jsleboeuf3@gmail.com',
    subject: `[${leadData.priorite}] Nouveau lead - ${leadData.customer_name || 'Client'} - ${leadData.city || 'Ville'}`,
    body: `
Nouveau lead capturé par Paul (Agent IA)

INFORMATIONS CLIENT
==================
Nom: ${leadData.customer_name || 'Non fourni'}
Téléphone: ${leadData.phone_number || 'Non fourni'}
Ville: ${leadData.city || 'Non fourni'}
Source: ${leadData.source || 'Non spécifié'}

DÉTAILS DE LA DEMANDE
=====================
Priorité: ${leadData.priorite}
Service: ${leadData.service_type || 'À déterminer'}
Estimation: ${leadData.price_estimate}$ + taxes

DESCRIPTION
===========
${leadData.description || leadData.summary}

TRANSCRIPTION COMPLÈTE
======================
${leadData.transcript}

INFORMATIONS SYSTÈME
====================
Call ID: ${leadData.call_id}
Date/Heure: ${new Date().toLocaleString('fr-CA', { timeZone: 'America/Montreal' })}
Durée appel: ${leadData.call_duration || 'N/A'}
En heures d'affaires: ${leadData.is_business_hours ? 'Oui' : 'Non'}

---
Agent IA Paul V5 - Drain Fortin
    `
  }
  
  // Store in email queue for processing
  await supabase.from('email_queue').insert(emailContent)
}

// Main webhook handler
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate HMAC signature
    const signature = req.headers.get('x-vapi-signature')
    if (!signature) {
      console.error('Missing HMAC signature')
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const bodyText = await req.text()
    const expectedSignature = createHmac('sha256', VAPI_WEBHOOK_SECRET)
      .update(bodyText)
      .digest('hex')

    if (signature !== expectedSignature) {
      console.error('Invalid HMAC signature')
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const body = JSON.parse(bodyText)
    const { type } = body

    console.log(`Webhook event received: ${type}`)

    // Handle end-of-call-report
    if (type === 'end-of-call-report') {
      const { transcript, recordingUrl, summary, call, analysis } = body
      const { customer } = call
      
      // Determine business hours
      const now = new Date()
      const hour = now.getHours()
      const dayOfWeek = now.getDay()
      const isBusinessHours = hour >= BUSINESS_HOURS.start && hour < BUSINESS_HOURS.end && dayOfWeek >= 1 && dayOfWeek <= 5
      
      // Determine priority
      const priority = determinePriority(transcript, customer)
      
      // Extract service type and source
      const serviceType = analysis?.service_type || 'Non spécifié'
      const source = analysis?.source || 'Non spécifié' // From "Comment avez-vous obtenu nos coordonnées?"
      
      // Calculate price estimate
      let priceEstimate = MINIMUM_PRICE
      const location = customer?.city?.toLowerCase() || ''
      
      // Add Rive-Sud surcharge
      if (RIVESUD_ZONES.some(zone => location.includes(zone))) {
        priceEstimate += RIVESUD_SURCHARGE
      }
      
      // Adjust for service type
      if (priority === 'P1_URGENCE') {
        priceEstimate = Math.max(550, priceEstimate)
      } else if (transcript.toLowerCase().includes('racine') || transcript.toLowerCase().includes('alésage')) {
        priceEstimate = PRICE_RANGES.racines.min
      } else if (transcript.toLowerCase().includes('drain français')) {
        priceEstimate = PRICE_RANGES.drain_francais.base
      }
      
      // Create lead data
      const leadData = {
        call_id: call.id,
        phone_number: customer?.number || 'Unknown',
        customer_name: customer?.name || null,
        city: customer?.city || null,
        address: customer?.address || null,
        transcript: transcript,
        summary: summary,
        recording_url: recordingUrl,
        priorite: priority,
        service_type: serviceType,
        source: source,
        price_estimate: priceEstimate,
        is_business_hours: isBusinessHours,
        call_duration: call.duration || null,
        created_at: new Date().toISOString(),
        status: 'new'
      }
      
      // Store lead in database
      const { error: leadError } = await supabase
        .from('leads')
        .insert(leadData)
      
      if (leadError) {
        console.error('Error creating lead:', leadError)
      }
      
      // Send email notification
      await sendEmailNotification(leadData)
      
      // Handle SMS notifications based on priority and special cases
      const lowerTranscript = transcript.toLowerCase()
      const customerName = customer?.name?.toLowerCase() || ''
      
      // Check for sous-dalle → Send to Maxime
      if (lowerTranscript.includes('sous-dalle') || 
          lowerTranscript.includes('sous dalle') ||
          lowerTranscript.includes('sous la dalle') ||
          lowerTranscript.includes('plomberie intérieure')) {
        const smsBody = `🔧 SOUS-DALLE/PLOMBERIE - ${customer?.name || 'Client'} - ${customer?.number || ''} - ${customer?.city || ''} - ${summary}`
        await sendSMS(MAXIME_PHONE, smsBody)
        console.log('SMS sent to Maxime for sous-dalle case')
      }
      
      // Check for famille Comeau or friends
      else if (customerName.includes('comeau') || 
               customerName.includes('étienne') ||
               lowerTranscript.includes('ami de guillaume')) {
        const smsBody = `👨‍👩‍👧‍👦 FAMILLE/AMI - ${customer?.name} - ${customer?.number || ''} - ${summary}`
        await sendSMS(GUILLAUME_PHONE, smsBody)
        console.log('SMS sent to Guillaume for family/friend')
      }
      
      // P1 Urgency → Immediate SMS to Guillaume
      else if (priority === 'P1_URGENCE') {
        const smsBody = `🚨 URGENCE P1 - ${customer?.name || 'Client'} - ${customer?.number || ''} - ${customer?.city || ''} - Min 550$ - ${summary}`
        await sendSMS(GUILLAUME_PHONE, smsBody)
        console.log('SMS sent to Guillaume for P1 urgency')
      }
      
      // P3 Gainage/Racines → Priority callback promised <1h
      else if (priority === 'P3_GAINAGE') {
        const smsBody = `🌳 GAINAGE/RACINES P3 - Rappel <1h promis - ${customer?.name || 'Client'} - ${customer?.number || ''} - ${customer?.city || ''} - ${summary}`
        await sendSMS(GUILLAUME_PHONE, smsBody)
        console.log('SMS sent to Guillaume for P3 gainage/racines')
      }
      
      // Store SMS log
      if (leadData) {
        await supabase.from('sms_logs').insert({
          lead_id: leadData.call_id,
          to_number: GUILLAUME_PHONE,
          message: `Lead ${priority} capturé`,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
      }
    }
    
    // Handle status-update events
    else if (type === 'status-update') {
      const { status, call } = body
      console.log(`Call ${call.id} status: ${status}`)
      
      // Update lead status
      await supabase
        .from('leads')
        .update({ call_status: status })
        .eq('call_id', call.id)
    }
    
    // Handle function-call events (for custom functions)
    else if (type === 'function-call') {
      const { functionCall, call } = body
      const { name, parameters } = functionCall
      
      console.log(`Function called: ${name}`, parameters)
      
      // Handle custom functions here
      // For example: schedule_callback, check_availability, etc.
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        type: type
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})