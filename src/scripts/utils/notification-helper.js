import { convertBase64ToUint8Array } from './index';

import { subscribePushNotification, unsubscribePushNotification } from '../data/api';
import CONFIG from '../config';
const VAPID_PUBLIC_KEY = CONFIG.VAPID_PUBLIC_KEY;

export function isNotificationAvailable() {
  return 'Notification' in window;
}

export function isNotificationGranted() {
  return Notification.permission === 'granted';
}

export async function requestNotificationPermission() {
  if (!isNotificationAvailable()) {
    console.error('Notification API unsupported.');
    return false;
  }

  if (isNotificationGranted()) {
    return true;
  }

  const status = await Notification.requestPermission();

  if (status === 'denied') {
    alert('Izin notifikasi ditolak.');
    return false;
  }

  if (status === 'default') {
    alert('Izin notifikasi ditutup atau diabaikan.');
    return false;
  }

  return true;
}

export async function getPushSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription();
}

export async function isCurrentPushSubscriptionAvailable() {
  return !!(await getPushSubscription());
}

export function generateSubscribeOptions() {
  return {
    userVisibleOnly: true,
    applicationServerKey: convertBase64ToUint8Array(VAPID_PUBLIC_KEY),
  };
}
export async function subscribe() {
  if (!(await requestNotificationPermission())) {
    return;
  }

  if (await isCurrentPushSubscriptionAvailable()) {
    alert('Already subscribed to push notifications');
    return;
  }

  console.log('Subscribing to push notifications...');

  const failureMessage = 'Failed to subscribe to push notifications';
  let pushSubscription = null;

  try {
    // Validate VAPID key first
    if (!VAPID_PUBLIC_KEY) {
      throw new Error('VAPID public key is missing');
    }

    const registration = await navigator.serviceWorker.ready;
    pushSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    const { endpoint, keys } = pushSubscription.toJSON();
    const response = await subscribePushNotification({ endpoint, keys });

    if (!response.ok) {
      throw new Error('Server rejected subscription');
    }

    alert('Successfully subscribed to push notifications!');
    return pushSubscription;
  } catch (error) {
    console.error('Subscription failed:', error);

    // Clean up if partial subscription occurred
    if (pushSubscription) {
      try {
        await pushSubscription.unsubscribe();
      } catch (unsubError) {
        console.error('Failed to cleanup subscription:', unsubError);
      }
    }

    alert(`${failureMessage}: ${error.message}`);
    throw error;
  }
}

export async function unsubscribe() {
  const failureUnsubscribeMessage = 'Langganan push notification gagal dinonaktifkan.';
  const successUnsubscribeMessage = 'Langganan push notification berhasil dinonaktifkan.';

  try {
    const pushSubscription = await getPushSubscription();

    if (!pushSubscription) {
      alert('Tidak bisa memutus langganan push notification karena belum berlangganan sebelumnya.');
      return;
    }

    const { endpoint, keys } = pushSubscription.toJSON();
    const response = await unsubscribePushNotification({ endpoint });

    if (!response.ok) {
      alert(failureUnsubscribeMessage);
      console.error('unsubscribe: response:', response);

      return;
    }

    const unsubscribed = await pushSubscription.unsubscribe();

    if (!unsubscribed) {
      alert(failureUnsubscribeMessage);
      await subscribePushNotification({ endpoint, keys });

      return;
    }

    alert(successUnsubscribeMessage);
  } catch (error) {
    alert(failureUnsubscribeMessage);
    console.error('unsubscribe: error:', error);
  }
}
