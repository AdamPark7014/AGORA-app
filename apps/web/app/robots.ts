import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/terminos', '/privacidad'],
      disallow: ['/feed', '/mensajes', '/perfil', '/ajustes', '/moderacion', '/api'],
    },
    sitemap: 'https://udlagora.com/sitemap.xml',
  };
}
