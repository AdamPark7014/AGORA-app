import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Outfit } from 'next/font/google';

import { Encabezado } from '@/componentes/encabezado';
import { Marco } from '@/componentes/marco';
import { Instalar } from '@/componentes/instalar';
import { BarraInferior } from '@/componentes/barra-inferior';
import { AvisoLegal } from '@/componentes/aviso-legal';
import { ProveedorTema } from '@/componentes/proveedor-tema';
import { RegistrarSW } from './registrar-sw';
import './globals.css';

const cuerpo = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--fuente-cuerpo',
  display: 'swap',
});

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--fuente-display',
  display: 'swap',
});

const BASE = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://udlagora.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'Ágora — la red de la UDLAP',
  description:
    'Red verificada para la comunidad UDLAP. Entra con tu correo @udlap.mx.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Ágora', statusBarStyle: 'default' },
  icons: { icon: '/icono.svg', apple: '/icono-192.png' },
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: BASE,
    siteName: 'Ágora',
    title: 'Ágora — la red de la UDLAP',
    description:
      'Red verificada para la comunidad UDLAP. Entra con tu correo @udlap.mx.',
    images: [{ url: '/og.svg', width: 1200, height: 630, alt: 'Ágora — la red de la UDLAP' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ágora — la red de la UDLAP',
    description:
      'Red verificada para la comunidad UDLAP. Entra con tu correo @udlap.mx.',
    images: ['/og.svg'],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1210' },
  ],
  width: 'device-width',
  initialScale: 1,
};

/** Aplica tema antes del paint — evita FOUC claro→oscuro. */
const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem('agora:tema');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${cuerpo.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        <ProveedorTema>
          <a href="#contenido" className="saltar-contenido">
            Ir al contenido
          </a>
          <div className="envoltura">
            <Encabezado />
            <RegistrarSW />
            <Instalar />
            <div id="contenido">
              <Marco>{children}</Marco>
            </div>
            <AvisoLegal />
          </div>
          <BarraInferior />
        </ProveedorTema>
      </body>
    </html>
  );
}
