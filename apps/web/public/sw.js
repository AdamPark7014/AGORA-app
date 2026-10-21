/**
 * Service worker de Ágora.
 *
 * IMPORTANTE: no cachear HTML ni chunks de Next. Antes se cacheaba `/` y al
 * desplegar una versión nueva el navegador seguía mostrando HTML viejo con
 * enlaces a CSS/JS que ya no existen → página sin estilos.
 *
 * Solo se cachean assets estáticos inmutables (icono, manifest, offline).
 */

// v5: ícono nuevo (pirámide), 21-10-2026. Subir la versión invalida los íconos cacheados.
const CACHE = 'agora-v5';
const ESTATICOS = [
  '/manifest.webmanifest',
  '/icono.svg',
  '/icono-192.png',
  '/icono-512.png',
  '/offline.html',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ESTATICOS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);

  // API y mutaciones: siempre red.
  if (url.pathname.startsWith('/api/')) return;
  if (evento.request.method !== 'GET') return;

  // HTML y bundles de Next: red primero. Sin cache de documentos.
  if (
    evento.request.mode === 'navigate' ||
    url.pathname.startsWith('/_next/') ||
    evento.request.headers.get('accept')?.includes('text/html')
  ) {
    evento.respondWith(
      fetch(evento.request).catch(() =>
        caches.match('/offline.html').then(
          (r) =>
            r ??
            new Response(
              '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Sin conexión</title></head><body style="font-family:sans-serif;padding:2rem;background:#0d1210;color:#e7e9ea"><h1>Sin conexión</h1><p>Ágora necesita internet.</p></body></html>',
              { headers: { 'content-type': 'text/html; charset=utf-8' } },
            ),
        ),
      ),
    );
    return;
  }

  // Icono, manifest y offline: cache primero (no cambian entre deploys).
  if (ESTATICOS.includes(url.pathname)) {
    evento.respondWith(
      caches.match(evento.request).then((cacheado) => cacheado ?? fetch(evento.request)),
    );
  }
});

self.addEventListener('push', (evento) => {
  if (!evento.data) return;
  const datos = evento.data.json();
  evento.waitUntil(
    self.registration.showNotification(datos.titulo ?? 'Ágora', {
      body: datos.cuerpo ?? '',
      icon: '/icono-192.png',
      data: { url: datos.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  evento.waitUntil(self.clients.openWindow(evento.notification.data?.url ?? '/'));
});
