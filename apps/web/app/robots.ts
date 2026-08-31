import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/registro', '/bienvenida', '/terminos', '/privacidad'],
      disallow: [
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
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
