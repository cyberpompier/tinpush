
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, title, body, url } = await req.json()
    console.log(`[Push] Request for user: ${user_id}`);

    // Verification critique de la librairie
    if (!webpush || typeof webpush.sendNotification !== 'function') {
      console.error("[Push] FATAL: web-push library not loaded correctly", webpush);
      throw new Error("Server Error: web-push library failed to load.");
    }

    // 1. Validation UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!user_id || !uuidRegex.test(user_id)) {
      return new Response(JSON.stringify({ error: `Invalid user_id format.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 2. Init Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Init WebPush
    try {
      const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
      
      if (!publicKey || !privateKey) {
        throw new Error("Missing VAPID env vars");
      }

      webpush.setVapidDetails(
        'mailto:admin@aura-app.com',
        publicKey,
        privateKey
      );
    } catch (e: any) {
      console.error("[Push] VAPID Config Error:", e);
      throw new Error("Server misconfiguration: VAPID keys invalid.");
    }

    // 4. Fetch Subscriptions
    const { data: subscriptions, error: dbError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (dbError) throw new Error(`DB Error: ${dbError.message}`)

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[Push] No subscriptions found.");
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

    // 5. Loop Sequential
    for (const sub of subscriptions) {
      try {
        console.log(`[Push] Processing Sub ID: ${sub.id}`);
        
        // Extraction robuste (gère les cas NULL ou les schémas mixtes)
        let endpoint = (sub.endpoint || "").trim();
        let p256dh = (sub.p256dh || "").trim();
        let auth = (sub.auth || "").trim();
        
        // Support legacy: si p256dh est vide, vérifier si c'est dans une colonne JSON 'keys'
        if (!p256dh && sub.keys && typeof sub.keys === 'object') {
             p256dh = (sub.keys.p256dh || "").trim();
             auth = (sub.keys.auth || "").trim();
        }

        // Vérification stricte AVANT appel librairie
        if (!endpoint) {
          console.warn(`[Push] Skipping ${sub.id}: Empty endpoint`);
          results.push({ success: false, id: sub.id, error: 'Empty endpoint' });
          continue;
        }

        if (!p256dh || !auth) {
           console.warn(`[Push] Skipping ${sub.id}: Missing keys`);
           results.push({ success: false, id: sub.id, error: 'Missing keys' });
           continue;
        }

        // Construction objet conforme
        const pushSubscription = {
          endpoint: endpoint,
          keys: {
            p256dh: p256dh,
            auth: auth
          }
        };

        // Envoi
        await webpush.sendNotification(pushSubscription, notificationPayload);
        results.push({ success: true, id: sub.id });

      } catch (error: any) {
        console.error(`[Push] Error sending to ${sub.id}:`, error.message);
        
        // Nettoyage automatique si expiré
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[Push] Removing expired subscription ${sub.id}`);
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
          results.push({ success: false, id: sub.id, error: 'Expired/Gone' });
        } else {
          results.push({ success: false, id: sub.id, error: error.message || 'WebPush Error' });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('[Push] Global Error Stack:', error.stack || error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
