import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Aviso de privacidad',
  description:
    'Qué datos recoge Ágora, para qué, con qué proveedores, cuánto tiempo los guarda y cómo ejercer tus derechos.',
  path: '/privacidad',
});

export default function PrivacidadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
