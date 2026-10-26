import type { Viewport } from 'next';
import { Bricolage_Grotesque, Outfit } from 'next/font/google';

import { Encabezado } from '@/componentes/encabezado';
import { Marco } from '@/componentes/marco';
import { Instalar } from '@/componentes/instalar';
import { BarraInferior } from '@/componentes/barra-inferior';
import { AvisoLegal } from '@/componentes/aviso-legal';
import { JsonLd } from '@/componentes/json-ld';
import { ProveedorTema } from '@/componentes/proveedor-tema';
import { ROOT_METADATA } from '@/lib/seo';
import { RegistrarSW } from './registrar-sw';
import { AvisosGlobales } from '@/componentes/avisos-globales';
import './globals.css';
import './diseno-d.css';

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

export const metadata = ROOT_METADATA;

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
        <JsonLd />
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
          <AvisosGlobales />
        </ProveedorTema>
      </body>
    </html>
  );
}
