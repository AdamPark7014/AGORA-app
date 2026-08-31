import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Términos de uso',
  description: 'Términos de uso de Ágora, la red verificada para la comunidad UDLAP.',
  path: '/terminos',
});

export default function TerminosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
