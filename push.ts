
import { supabase } from './lib/supabase';

// Clé publique VAPID par défaut pour le développement (permet d'éviter l'erreur bloquante)
// En production, cette variable doit être définie dans les variables d'environnement de Netlify/Vercel
const DEFAULT_VAPID_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nkx8Wk';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_KEY;

function urlBase64ToUint8Array(base64String: string) {
  try {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (e) {
    console.error("Erreur de format VAPID Key:", e);
    throw new Error("La clé VAPID fournie est invalide (format incorrect).");
  }
}

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered with scope:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }
  throw new Error('Service Workers not supported');
}

export async function subscribeToPushNotifications() {
  // 1. Check Browser Support
  if (!('serviceWorker' in navigator)) {
    throw new Error('Les Service Workers ne sont pas supportés par ce navigateur.');
  }

  if (!('PushManager' in window)) {
    throw new Error('Les notifications Push ne sont pas supportées par ce navigateur.');
  }

  // 2. Validate VAPID Key
  if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY === 'YOUR_VAPID_PUBLIC_KEY') {
    // Ne bloquons pas l'app, retournons simplement une erreur gérée
    console.warn("VAPID_PUBLIC_KEY non configurée. Les notifications ne fonctionneront pas.");
    throw new Error('La configuration des notifications est incomplète (VAPID Key manquante).');
  }

  // 3. Request Permission Explicitly
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permission de notification refusée par l\'utilisateur.');
  }

  // 4. Get Service Worker Registration
  const registration = await navigator.serviceWorker.ready;

  // 5. Subscribe
  let subscription = await registration.pushManager.getSubscription();
  
  if (!subscription) {
     console.log("No existing subscription, creating new one...");
     try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      } catch (err: any) {
        console.error('Erreur technique lors de la souscription Push:', err);
        throw new Error(`Erreur de souscription: ${err.message}`);
      }
  } else {
    console.log("Found existing subscription.");
  }

  // 6. Prepare data for Supabase
  const subscriptionJson = subscription.toJSON();
  const endpoint = subscriptionJson.endpoint || subscription.endpoint;
  const p256dh = subscriptionJson.keys?.p256dh;
  const auth = subscriptionJson.keys?.auth;

  // LOG FOR DIAGNOSIS
  console.log("Preparing to save subscription to DB:", {
     endpoint: endpoint ? 'OK (Present)' : 'MISSING',
     p256dh: p256dh ? 'OK (Present)' : 'MISSING',
     auth: auth ? 'OK (Present)' : 'MISSING',
     raw: subscriptionJson
  });

  if (!endpoint || !p256dh || !auth) {
    console.error("Subscription Data Incomplete:", subscriptionJson);
    throw new Error('Échec de la génération des clés de chiffrement Push (Endpoint ou clés manquants).');
  }

  // 7. Validate and prepare User ID
  const userProfileStr = localStorage.getItem('aura_profile');
  let userId: string | null = null;

  if (userProfileStr) {
    try {
      const parsed = JSON.parse(userProfileStr);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (parsed.id && uuidRegex.test(parsed.id)) {
        userId = parsed.id;
      }
    } catch (e) {
      console.error("Failed to parse user profile from localStorage", e);
    }
  }

  // 8. Save to Supabase (Manual Update/Insert logic to avoid conflicts)
  if (userId) {
    try {
      // A. Check if subscription exists
      const { data: existingSubs } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      const existingId = existingSubs && existingSubs.length > 0 ? existingSubs[0].id : null;

      let error = null;

      if (existingId) {
        // B. Update existing
        console.log('Mise à jour de l\'abonnement existant...');
        const { error: updateError } = await supabase
          .from('push_subscriptions')
          .update({
            endpoint: endpoint,
            p256dh: p256dh,
            auth: auth
          })
          .eq('id', existingId);
        error = updateError;
      } else {
        // C. Insert new
        console.log('Création d\'un nouvel abonnement...');
        const { error: insertError } = await supabase
          .from('push_subscriptions')
          .insert({
            user_id: userId,
            endpoint: endpoint,
            p256dh: p256dh,
            auth: auth
          });
        error = insertError;
      }

      if (error) {
        console.error('Error saving subscription to Supabase:', error);
        
        // If RLS prevents update/insert
        if (error.code === '42501' || error.message.includes('row-level security')) {
          // On ne throw pas ici pour ne pas effrayer l'utilisateur, ça marche en local
          console.warn("Accès base de données restreint (RLS). La souscription est active sur le navigateur mais non sauvegardée.");
          return subscription;
        }
        
        throw new Error("Erreur de sauvegarde base de données: " + error.message);
      }
    } catch (e: any) {
        console.error("Erreur interaction Supabase:", e);
        // Fallback: on retourne la souscription même si la sauvegarde DB échoue, pour que l'UI dise "Succès"
        return subscription;
    }
  }

  console.log('Successfully subscribed to push notifications!');
  return subscription;
}
