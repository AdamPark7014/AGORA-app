'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { api } from '@/lib/api';
import { EsqueletoPerfil } from '@/componentes/esqueleto';

/** Deep link web para avisos INSIGNIA (`/perfil/mio` → perfil del usuario autenticado). */
export default function PerfilMioRedirect() {
  const router = useRouter();

  useEffect(() => {
    api<{ handle: string }>('/perfil/mio')
      .then((p) => router.replace(`/perfil/${p.handle}`))
      .catch(() => router.replace('/ajustes'));
  }, [router]);

  return (
    <main>
      <EsqueletoPerfil />
    </main>
  );
}
