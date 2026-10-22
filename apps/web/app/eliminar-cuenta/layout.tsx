import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Eliminar tu cuenta',
  description:
    'Cómo eliminar tu cuenta de Ágora desde la app o la web, qué se borra y qué se conserva.',
  path: '/eliminar-cuenta',
});

export default function EliminarCuentaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
