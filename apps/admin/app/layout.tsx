import type { Metadata } from 'next';

import { Barra } from '@/componentes/barra';
import './globals.css';

export const metadata: Metadata = {
  title: 'Moderación · Ágora',
  description: 'Panel de moderación.',
  // Superficie administrativa: fuera de buscadores.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="envoltura">
          <Barra />
          {children}
        </div>
      </body>
    </html>
  );
}
