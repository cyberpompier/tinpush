
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gestion du preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, title, body, url } = await req.json()

    // 1. Initialisation de Supabase avec la clé Service Role (Admin)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Configuration de Web Push
    webpush.setVapidDetails(
      'mailto:admin@aura-app.com',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    )

    // 3. Récupération des abonnements de l'utilisateur
    const { data: subscriptions, error: dbError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (dbError) throw new Error(dbError.message)
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscriptions found for user' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 4. Envoi de la notification
    const notificationPayload = JSON.stringify({
      title: title || 'Aura',
      body: body || 'Vous avez une nouvelle notification !',
      url: url || '/',
      icon: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f496.png'
    })

    const results = await Promise.all(subscriptions.map(async (sub) => {
      try {
        // Validation stricte des données
        if (!sub.endpoint || typeof sub.endpoint !== 'string' || sub.endpoint.trim() === '') {
          console.warn(`Abonnement ${sub.id} invalide : endpoint manquant ou invalide`);
          return { success: false, id: sub.id, error: 'Invalid endpoint' };
        }
        
        if (!sub.p256dh || !sub.auth) {
          console.warn(`Abonnement ${sub.id} invalide : clés manquantes`);
          return { success: false, id: sub.id, error: 'Missing keys' };
        }

        const pushSubscription = {
          endpoint: sub.endpoint.trim(),
          keys: {
            p256dh: sub.p256dh.trim(),
            auth: sub.auth.trim(),
          },
        };
        
        await webpush.sendNotification(pushSubscription, notificationPayload);
        return { success: true, id: sub.id };
        
      } catch (error: any) {
        // Gestion spécifique des erreurs 410 (Gone) et 404 (Not Found) -> Suppression de la DB
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Suppression de l'abonnement expiré : ${sub.id}`);
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
          return { success: false, id: sub.id, error: 'Expired subscription removed' };
        }
        
        console.error(`Erreur d'envoi pour ${sub.id}:`, error);
        return { success: false, id: sub.id, error: error.message || 'Unknown send error' };
      }
    }));

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Global error in send-push:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
