'use client';

import Link from 'next/link';

import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { RetosAmigos } from '@/componentes/retos-amigos';
import { RetosHistorial } from '@/componentes/retos-historial';
import { RetosRankingSemanal } from '@/componentes/retos-ranking-semanal';

export default function RetosPage() {
  return (
    <>
      <EncabezadoPagina
        titulo="Duelos del campus"
        entradilla="Acepta retos, sigue el marcador y mira quién domina la semana."
      />
      <div className="contenedor-pagina contenedor-pagina--estrecho">
        <RetosAmigos />
        <RetosRankingSemanal />
        <RetosHistorial />
        <p className="tenue retos-pagina-pie">
          ¿Buscas a alguien para retar?{' '}
          <Link href="/directorio">Explora el directorio</Link> o abre un perfil y pulsa «Retar».
        </p>
      </div>
    </>
  );
}
