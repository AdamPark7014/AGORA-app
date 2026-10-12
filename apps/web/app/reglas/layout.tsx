import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Reglas de la comunidad',
  description:
    'Qué se vale y qué no en Ágora: las cinco líneas rojas, cómo se modera y cómo reportar.',
  path: '/reglas',
});

export default function ReglasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
