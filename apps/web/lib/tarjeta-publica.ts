import { buildMetadata, OG_IMAGE, SITE_URL } from '@/lib/seo';

export interface TarjetaPublica {
  titulo: string;
  descripcion: string;
  imagen: string | null;
  canonical: string;
}

/** Fetch server-side a la API interna (Docker / local). */
export async function fetchTarjeta(
  tipo: 'publicacion' | 'perfil' | 'evento' | 'anuncio',
  id: string,
): Promise<TarjetaPublica | null> {
  const base = (process.env.API_INTERNA ?? 'http://localhost:4200').replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/public/tarjeta/${tipo}/${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as TarjetaPublica;
  } catch {
    return null;
  }
}

export async function metadataDesdeTarjeta(
  tipo: 'publicacion' | 'perfil' | 'evento' | 'anuncio',
  id: string,
  fallbackTitle: string,
) {
  const tarjeta = await fetchTarjeta(tipo, id);
  const path =
    tipo === 'publicacion'
      ? `/publicacion/${id}`
      : tipo === 'perfil'
        ? `/perfil/${id}`
        : tipo === 'evento'
          ? `/eventos/${id}`
          : `/marketplace/${id}`;

  if (!tarjeta) {
    return buildMetadata({ title: fallbackTitle, path, noIndex: true });
  }

  const imagen = tarjeta.imagen
    ? tarjeta.imagen.startsWith('http')
      ? tarjeta.imagen
      : `${SITE_URL}${tarjeta.imagen.startsWith('/') ? '' : '/'}${tarjeta.imagen}`
    : OG_IMAGE;

  return buildMetadata({
    title: tarjeta.titulo,
    description: tarjeta.descripcion,
    path: tarjeta.canonical || path,
    image: imagen,
    noIndex: true,
  });
}
