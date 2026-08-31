import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { PreviewPublica } from '@/componentes/preview-publica';
import { fetchTarjeta, metadataDesdeTarjeta } from '@/lib/tarjeta-publica';

import Detalle from './detalle';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return metadataDesdeTarjeta('perfil', handle, 'Perfil');
}

export default async function PaginaPerfil({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const jar = await cookies();
  if (!jar.get('agora_sesion')?.value) {
    const tarjeta = await fetchTarjeta('perfil', handle);
    if (!tarjeta) notFound();
    return <PreviewPublica tarjeta={tarjeta} siguiente={`/perfil/${handle}`} />;
  }
  return <Detalle params={Promise.resolve({ handle })} />;
}
