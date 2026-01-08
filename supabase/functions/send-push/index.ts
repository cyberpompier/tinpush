
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
    console.log(`Sending push to user: ${user_id}`);

    // VALIDATION UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!user_id || !uuidRegex.test(user_id)) {
      console.error(`Invalid UUID format: ${user_id}`);
      return new Response(JSON.stringify({ error: `Invalid user_id format: "${user_id}". Must be a valid UUID.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    webpush.setVapidDetails(
      'mailto:admin@aura-app.com',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    )

    const { data: subscriptions, error: dbError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (dbError) {
      console.error("DB Error:", dbError);
      throw new Error(`DB Error: ${dbError.message}`)
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions found.");
      return new Response(JSON.stringify({ message: 'No subscriptions found for user' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const notificationPayload = JSON.stringify({
      title: title || 'Aura',
      body: body || 'Vous avez une nouvelle notification !',
      url: url || '/',
      icon: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f496.png'
    })

    const results = await Promise.all(subscriptions.map(async (sub) => {
      try {
        // Deep Validation
        if (!sub.endpoint || typeof sub.endpoint !== 'string' || sub.endpoint.trim().length === 0) {
          console.error(`Invalid endpoint for sub ${sub.id}:`, sub.endpoint);
          return { success: false, id: sub.id, error: 'Invalid endpoint format' };
        }
        
        if (!sub.p256dh || !sub.auth) {
          console.error(`Missing keys for sub ${sub.id}`);
          return { success: false, id: sub.id, error: 'Missing keys' };
        }

        const pushSubscription = {
          endpoint: sub.endpoint.trim(),
          keys: {
            p256dh: sub.p256dh.trim(),
            auth: sub.auth.trim(),
          },
        };

        // Attempt Send
        await webpush.sendNotification(pushSubscription, notificationPayload);
        return { success: true, id: sub.id };

      } catch (error: any) {
        // Handle Gone/Expired
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Cleaning up expired subscription: ${sub.id}`);
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
          return { success: false, id: sub.id, error: 'Expired subscription removed' };
        }
        
        console.error(`WebPush Error for ${sub.id}:`, error);
        return { success: false, id: sub.id, error: error.message || 'Unknown WebPush error' };
      }
    }));

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Global Handler Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
