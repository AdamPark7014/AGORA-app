import type { Metadata } from 'next';

/** Fuente única de SEO — sitemap, robots, layouts y OG comparten estos valores. */
export const SITE_URL = (process.env.NEXT_PUBLIC_WEB_URL ?? 'https://udlagora.com').replace(
  /\/$/,
  '',
);

export const SITE_NAME = 'Ágora';

export const DEFAULT_TITLE = 'Ágora — la red de la UDLAP';

export const DEFAULT_DESCRIPTION =
  'Red verificada para la comunidad UDLAP. Entra con tu correo @udlap.mx, conecta con tu generación y comparte en el campus.';

export const KEYWORDS = [
  'Ágora',
  'UDLAP',
  'Universidad de las Américas Puebla',
  'red social universitaria',
  'comunidad UDLAP',
  'estudiantes UDLAP',
  'campus Puebla',
  'udlagora',
] as const;

export const LOCALE = 'es_MX';

export const OG_IMAGE = '/og.png';

export const OG_IMAGE_ALT = 'Ágora — la red verificada de la UDLAP';

/** FAQ visible en landing — debe coincidir 1:1 con el markup de la página. */
export const LANDING_FAQ = [
  {
    pregunta: '¿Quién puede entrar a Ágora?',
    respuesta:
      'Solo personas con correo institucional @udlap.mx. Verificamos el acceso con un código de un solo uso; no hay registro abierto al público.',
  },
  {
    pregunta: '¿Ágora está afiliada a la UDLAP?',
    respuesta:
      'No. Es un proyecto independiente hecho por estudiantes. Los colores se inspiran en la identidad del campus; el escudo y el nombre de la universidad son suyos y no se usan aquí.',
  },
  {
    pregunta: '¿Cómo funciona el acceso?',
    respuesta:
      'Escribes tu correo @udlap.mx, recibes un código de 6 dígitos y entras. No usamos contraseñas permanentes.',
  },
  {
    pregunta: '¿Quién ve lo que publico?',
    respuesta:
      'La red es solo para la comunidad verificada. Puedes ajustar la visibilidad de tu perfil; el contenido no se indexa de forma masiva en buscadores.',
  },
  {
    pregunta: '¿Cómo contacto al equipo?',
    respuesta:
      'Escríbenos a contacto@udlagora.com. También están los Términos y la Política de privacidad.',
  },
] as const;

export interface BuildMetadataOptions {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  imageAlt?: string;
  noIndex?: boolean;
}

/** Metadata tipada para rutas públicas e hijas. */
export function buildMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = OG_IMAGE,
  imageAlt = OG_IMAGE_ALT,
  noIndex = false,
}: BuildMetadataOptions): Metadata {
  const canonical = path === '/' ? SITE_URL : `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const fullTitle = title.includes('Ágora') ? title : `${title} · ${SITE_NAME}`;

  return {
    title: fullTitle,
    description,
    keywords: [...KEYWORDS],
    alternates: { canonical },
    robots: noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type: 'website',
      locale: LOCALE,
      url: canonical,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
    },
  };
}

export const ROOT_METADATA: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...buildMetadata({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: '/',
  }),
  title: {
    default: DEFAULT_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'default' },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icono.svg', type: 'image/svg+xml' },
      { url: '/icono-192.png', sizes: '192x192' },
    ],
    apple: [{ url: '/icono-192.png', sizes: '192x192' }],
  },
  authors: [{ name: 'Ágora', url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'social network',
};

const ORG_ID = `${SITE_URL}/#organization`;
const WEB_ID = `${SITE_URL}/#website`;
const APP_ID = `${SITE_URL}/#app`;

/**
 * JSON-LD @graph: Organization + WebSite + WebApplication + FAQPage.
 * Sin SearchAction (Google deprecó sitelinks search box; /buscar es gated).
 */
export function jsonLdScripts(): Record<string, unknown>[] {
  return [
    {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': ORG_ID,
          name: SITE_NAME,
          url: SITE_URL,
          logo: `${SITE_URL}/icono-512.png`,
          description: DEFAULT_DESCRIPTION,
          email: 'contacto@udlagora.com',
          sameAs: [],
        },
        {
          '@type': 'WebSite',
          '@id': WEB_ID,
          name: SITE_NAME,
          url: SITE_URL,
          description: DEFAULT_DESCRIPTION,
          inLanguage: 'es-MX',
          publisher: { '@id': ORG_ID },
        },
        {
          '@type': 'WebApplication',
          '@id': APP_ID,
          name: SITE_NAME,
          url: SITE_URL,
          applicationCategory: 'SocialNetworkingApplication',
          operatingSystem: 'Web',
          description: DEFAULT_DESCRIPTION,
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'MXN',
          },
          publisher: { '@id': ORG_ID },
        },
        {
          '@type': 'FAQPage',
          '@id': `${SITE_URL}/#faq`,
          mainEntity: LANDING_FAQ.map((item) => ({
            '@type': 'Question',
            name: item.pregunta,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.respuesta,
            },
          })),
        },
      ],
    },
  ];
}

/** Rutas indexables en sitemap.xml */
export const SITEMAP_ROUTES: Array<{
  path: string;
  changeFrequency: 'weekly' | 'monthly';
  priority: number;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/registro', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/bienvenida', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/terminos', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/privacidad', changeFrequency: 'monthly', priority: 0.4 },
];
