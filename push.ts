
import { supabase } from './lib/supabase';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;

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
    throw new Error('La configuration VAPID_PUBLIC_KEY est manquante ou incorrecte dans Netlify.');
  }

  // 3. Request Permission Explicitly
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permission de notification refusée par l\'utilisateur.');
  }

  // 4. Get Service Worker Registration
  const registration = await navigator.serviceWorker.ready;

  // 5. Subscribe
  let subscription;
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  } catch (err: any) {
    console.error('Erreur technique lors de la souscription Push:', err);
    throw new Error(`Erreur de souscription: ${err.message}`);
  }

  // 6. Prepare data for Supabase
  const subscriptionJson = subscription.toJSON();
  
  if (!subscriptionJson.keys || !subscriptionJson.keys.p256dh || !subscriptionJson.keys.auth) {
    throw new Error('Échec de la génération des clés de chiffrement Push.');
  }

  // 7. Save to Supabase (Upsert based on endpoint usually better, but insert is fine for now)
  // We identify user by localStorage ID if available, otherwise anonymous
  const userProfileStr = localStorage.getItem('aura_profile');
  const userId = userProfileStr ? JSON.parse(userProfileStr).id : 'anon';

  const { error } = await supabase
    .from('push_subscriptions')
    .insert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscriptionJson.keys.p256dh,
      auth: subscriptionJson.keys.auth
    });

  if (error) {
    console.error('Error saving subscription to Supabase:', error);
    // Note: We don't throw here to avoid telling the user it failed if only the DB save failed 
    // (though strictly speaking the backend won't know about it).
    // Let's assume duplications might cause errors, so we log but consider success locally.
    if (error.code !== '23505') { // Ignore unique constraint violations
        throw new Error("Erreur de sauvegarde base de données.");
    }
  }

  console.log('Successfully subscribed to push notifications!');
  return subscription;
}
