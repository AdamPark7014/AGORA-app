import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Privacidad',
  description: 'Política de privacidad de Ágora: qué datos recopilamos y cómo los protegemos.',
  path: '/privacidad',
});

export default function PrivacidadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
