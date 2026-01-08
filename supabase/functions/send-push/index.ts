
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

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
    console.log(`[Push] Start sending to user: ${user_id}`);

    // 1. Validation UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!user_id || !uuidRegex.test(user_id)) {
      console.error(`[Push] Invalid UUID: ${user_id}`);
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
      webpush.setVapidDetails(
        'mailto:admin@aura-app.com',
        Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
        Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
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

    if (dbError) {
      throw new Error(`DB Error: ${dbError.message}`)
    }

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

    // 5. Loop Sequential with STRICT logging
    for (const sub of subscriptions) {
      try {
        console.log(`[Push] Processing Sub ID: ${sub.id}`);
        
        const endpoint = sub.endpoint ? String(sub.endpoint).trim() : "";
        const p256dh = sub.p256dh ? String(sub.p256dh).trim() : "";
        const auth = sub.auth ? String(sub.auth).trim() : "";

        if (endpoint.length === 0) {
          console.warn(`[Push] Skipping ${sub.id}: Empty endpoint.`);
          results.push({ success: false, id: sub.id, error: 'Empty endpoint' });
          continue;
        }

        if (p256dh.length === 0 || auth.length === 0) {
           console.warn(`[Push] Skipping ${sub.id}: Missing keys.`);
           results.push({ success: false, id: sub.id, error: 'Missing keys' });
           continue;
        }

        // Construct object EXACTLY as expected
        const pushSubscription = {
          endpoint: endpoint,
          keys: {
            p256dh: p256dh,
            auth: auth
          }
        };

        // Debug Log
        console.log(`[Push] Sending to endpoint: ${endpoint.substring(0, 30)}...`);

        // Send
        await webpush.sendNotification(pushSubscription, notificationPayload);
        results.push({ success: true, id: sub.id });

      } catch (error: any) {
        console.error(`[Push] Error sending to ${sub.id}:`, error);
        
        // Auto-cleanup for expired subs
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[Push] CLEANUP: Deleting expired sub ${sub.id}`);
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
    console.error('[Push] Global Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
