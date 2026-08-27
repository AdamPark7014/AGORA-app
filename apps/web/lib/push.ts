import { api } from '@/lib/api';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function estadoPush(): Promise<{ soportado: boolean; activo: boolean; suscrito: boolean }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { soportado: false, activo: false, suscrito: false };
  }

  const { activo } = await api<{ activo: boolean }>('/push/vapid-public-key');
  if (!activo) return { soportado: true, activo: false, suscrito: false };

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return { soportado: true, activo: true, suscrito: Boolean(sub) };
}

export async function suscribirPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return false;

  const { publicKey, activo } = await api<{ publicKey: string | null; activo: boolean }>(
    '/push/vapid-public-key',
  );
  if (!activo || !publicKey) return false;

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  await api('/push/suscribir', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  });

  return true;
}

export async function desuscribirPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const json = sub.toJSON();
  if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
    await api('/push/suscribir', {
      method: 'DELETE',
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      }),
    });
  }

  await sub.unsubscribe();
}
