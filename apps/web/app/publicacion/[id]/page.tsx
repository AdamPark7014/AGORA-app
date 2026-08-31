import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { PreviewPublica } from '@/componentes/preview-publica';
import { fetchTarjeta, metadataDesdeTarjeta } from '@/lib/tarjeta-publica';

import Detalle from './detalle';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return metadataDesdeTarjeta('publicacion', id, 'Publicación');
}

export default async function PaginaPublicacion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jar = await cookies();
  if (!jar.get('agora_sesion')?.value) {
    const tarjeta = await fetchTarjeta('publicacion', id);
    if (!tarjeta) notFound();
    return <PreviewPublica tarjeta={tarjeta} siguiente={`/publicacion/${id}`} />;
  }
  return <Detalle params={Promise.resolve({ id })} />;
}
