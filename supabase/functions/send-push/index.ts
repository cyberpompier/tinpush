
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import _webpush from "npm:web-push@3.6.7"

// Declare Deno for TS compilers that don't include Deno types
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// FIX CRITIQUE: Gestion de la compatibilité des imports CommonJS/ESM dans Deno
const webpush = _webpush.default || _webpush;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gestion CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, title, body, url } = await req.json()
    console.log(`[Push] Starting push for user: ${user_id}`);

    // Verification que la librairie est bien chargée et fonctionnelle
    if (!webpush || typeof webpush.sendNotification !== 'function') {
      console.error("[Push] FATAL: web-push library structure invalid", webpush);
      throw new Error("Server Error: web-push library failed to load properly.");
    }

    // 1. Validation de l'ID utilisateur
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!user_id || !uuidRegex.test(user_id)) {
      return new Response(JSON.stringify({ error: `Invalid user_id format.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 2. Initialisation Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Configuration VAPID
    try {
      const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
      const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@aura-app.com';
      
      if (!publicKey || !privateKey) {
        throw new Error("VAPID keys missing in environment variables.");
      }

      webpush.setVapidDetails(subject, publicKey, privateKey);
    } catch (e: any) {
      console.error("[Push] VAPID Config Error:", e);
      throw new Error("Server misconfiguration: VAPID setup failed.");
    }

    // 4. Récupération des souscriptions
    const { data: subscriptions, error: dbError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (dbError) throw new Error(`Database Error: ${dbError.message}`)

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[Push] No subscriptions found for user.");
      return new Response(JSON.stringify({ message: 'No subscriptions found', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const notificationPayload = JSON.stringify({
      title: title || 'Aura',
      body: body || 'Vous avez une nouvelle notification !',
      url: url || '/',
      icon: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f496.png'
    });

    const results = [];
    let successCount = 0;

    // 5. Envoi des notifications
    for (const sub of subscriptions) {
      try {
        // --- DIAGNOSTIC LOGGING START ---
        console.log(`[Push] Processing subscription ID: ${sub.id}`);
        console.log(`[Push] Raw DB Record:`, JSON.stringify(sub));
        // --- DIAGNOSTIC LOGGING END ---

        // Extraction et nettoyage des données
        let endpoint = (sub.endpoint || "").trim();
        let p256dh = (sub.p256dh || "").trim();
        let auth = (sub.auth || "").trim();
        
        // Support pour l'ancien format (JSON column 'keys') si les colonnes directes sont vides
        if ((!p256dh || !auth) && sub.keys && typeof sub.keys === 'object') {
             console.log(`[Push] Using fallback 'keys' JSON column`);
             p256dh = (sub.keys.p256dh || "").trim();
             auth = (sub.keys.auth || "").trim();
        }

        // Validation stricte des champs requis par web-push AVANT de construire l'objet
        if (!endpoint) {
          console.warn(`[Push] SKIPPING: No endpoint found for ID ${sub.id}`);
          results.push({ success: false, id: sub.id, error: 'Missing endpoint' });
          continue;
        }

        if (!p256dh || !auth) {
           console.warn(`[Push] SKIPPING: Missing keys for ID ${sub.id}. p256dh: ${!!p256dh}, auth: ${!!auth}`);
           results.push({ success: false, id: sub.id, error: 'Missing keys' });
           continue;
        }

        // Construction de l'objet de souscription STRICTEMENT conforme à l'interface PushSubscription
        const pushSubscription = {
          endpoint: endpoint,
          keys: {
            p256dh: p256dh,
            auth: auth
          }
        };

        // --- DIAGNOSTIC LOGGING FOR WEBPUSH ---
        console.log(`[Push] Sending to WebPush with object:`, JSON.stringify(pushSubscription));
        // --------------------------------------

        // Envoi via web-push
        await webpush.sendNotification(pushSubscription, notificationPayload);
        
        console.log(`[Push] Sent successfully to ${sub.id}`);
        results.push({ success: true, id: sub.id });
        successCount++;

      } catch (error: any) {
        console.error(`[Push] Failed to send to ${sub.id}:`, error.message);
        
        // Gestion des souscriptions expirées (410 Gone / 404 Not Found)
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[Push] Removing expired subscription ${sub.id}`);
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
          results.push({ success: false, id: sub.id, error: 'Expired/Gone' });
        } else {
          results.push({ success: false, id: sub.id, error: error.message || 'WebPush Error' });
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successCount, 
      total: subscriptions.length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('[Push] Handler Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Bad Request pour que le client voie l'erreur
    })
  }
})
