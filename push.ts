
import { supabase } from './lib/supabase';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY';

function urlBase64ToUint8Array(base64String: string) {
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
  if (!('serviceWorker' in navigator)) {
    throw new Error('No Service Worker support!');
  }

  if (!('PushManager' in window)) {
    throw new Error('No Push API Support!');
  }

  // 1. Register or get existing registration
  const registration = await navigator.serviceWorker.ready;

  // 2. Subscribe using PushManager
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });

  // 3. Extract keys for Supabase
  const subscriptionJson = subscription.toJSON();
  
  if (!subscriptionJson.keys || !subscriptionJson.keys.p256dh || !subscriptionJson.keys.auth) {
    throw new Error('Failed to generate push keys');
  }

  // 4. Save to Supabase
  const { error } = await supabase
    .from('push_subscriptions')
    .insert({
      endpoint: subscription.endpoint,
      p256dh: subscriptionJson.keys.p256dh,
      auth: subscriptionJson.keys.auth
    });

  if (error) {
    console.error('Error saving subscription to Supabase:', error);
    throw error;
  }

  console.log('Successfully subscribed to push notifications!');
  return subscription;
}
