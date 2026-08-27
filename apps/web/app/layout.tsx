import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Outfit } from 'next/font/google';

import { Encabezado } from '@/componentes/encabezado';
import { Marco } from '@/componentes/marco';
import { Instalar } from '@/componentes/instalar';
import { BarraInferior } from '@/componentes/barra-inferior';
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

export const metadata: Metadata = {
  title: 'Ágora — la red de la UDLAP',
  description:
    'Red verificada para la comunidad UDLAP. Entra con tu correo @udlap.mx.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Ágora', statusBarStyle: 'default' },
  icons: { icon: '/icono.svg', apple: '/icono-192.png' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1114' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${cuerpo.variable} ${display.variable}`} suppressHydrationWarning>
      <body>
        <ProveedorTema>
          <div className="envoltura">
            <Encabezado />
            <RegistrarSW />
            <Instalar />
            <Marco>{children}</Marco>
            <p className="aviso">
              <strong>
                Ágora no está afiliada a la Universidad de las Américas Puebla.
              </strong>{' '}
              Es un proyecto independiente hecho por estudiantes. Los colores se
              inspiran en la identidad de la UDLAP; el escudo y el nombre de la
              institución son suyos y no se usan aquí.{' '}
              <a href="/terminos">Términos</a> · <a href="/privacidad">Privacidad</a>
            </p>
          </div>
          <BarraInferior />
        </ProveedorTema>
      </body>
    </html>
  );
}
