import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/seo';

/** Rutas de app autenticadas — no indexar (ni gastar crawl budget en redirects). */
const DISALLOW = [
  '/feed',
  '/mensajes',
  '/perfil',
  '/ajustes',
  '/moderacion',
  '/api',
  '/buscar',
  '/retos',
  '/guardados',
  '/mas',
  '/eventos',
  '/marketplace',
  '/publicacion',
  '/hashtag',
  '/directorio',
  '/anonimo',
  '/aventones',
  '/notificaciones',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/registro', '/bienvenida', '/terminos', '/privacidad'],
      disallow: DISALLOW,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
