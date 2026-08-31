import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Bienvenida',
  description:
    'Conoce Ágora: feed del campus, comunidades, eventos y mensajes verificados para la UDLAP.',
  path: '/bienvenida',
});

export default function BienvenidaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
