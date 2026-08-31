import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Registro',
  description:
    'Completa tu perfil en Ágora con tu correo @udlap.mx verificado y únete a la red del campus.',
  path: '/registro',
});

export default function RegistroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
