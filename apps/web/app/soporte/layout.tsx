import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Soporte',
  description:
    'Ayuda con Ágora: cómo entrar, qué hacer si no llega el código, cambiar tu contraseña, reportar y contactar al equipo.',
  path: '/soporte',
});

export default function SoporteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
