'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Swords } from 'lucide-react';

import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { EstadoError } from '@/componentes/estado-error';
import { EsqueletoLista } from '@/componentes/esqueleto';
import { RetosAmigos, type EstadoCargaRetos } from '@/componentes/retos-amigos';
import { RetosHistorial } from '@/componentes/retos-historial';
import { RetosRankingSemanal } from '@/componentes/retos-ranking-semanal';

type Seccion = 'amigos' | 'ranking' | 'historial';
const SECCIONES: Seccion[] = ['amigos', 'ranking', 'historial'];

export default function RetosPage() {
  // Cada sección se pinta sola y desaparece si no tiene nada. La página junta
  // lo que reportan para no quedarse en blanco: esqueleto mientras cargan,
  // vacío si las tres vinieron vacías y error si ninguna pudo cargar.
  const [estados, setEstados] = useState<Partial<Record<Seccion, EstadoCargaRetos>>>({});
  const [intento, setIntento] = useState(0);

  const reportar = useCallback(
    (seccion: Seccion, estado: EstadoCargaRetos) =>
      setEstados((previo) => (previo[seccion] === estado ? previo : { ...previo, [seccion]: estado })),
    [],
  );
  const alCargarAmigos = useCallback((e: EstadoCargaRetos) => reportar('amigos', e), [reportar]);
  const alCargarRanking = useCallback((e: EstadoCargaRetos) => reportar('ranking', e), [reportar]);
  const alCargarHistorial = useCallback((e: EstadoCargaRetos) => reportar('historial', e), [reportar]);

  const listos = SECCIONES.every((s) => estados[s] !== undefined);
  const hayDatos = SECCIONES.some((s) => estados[s] === 'datos');
  const hayError = SECCIONES.some((s) => estados[s] === 'error');

  return (
    <main>
      <EncabezadoPagina
        titulo="Duelos del campus"
        entradilla="Acepta retos, sigue el marcador y mira quién domina la semana."
      />
      <div key={intento}>
        <RetosAmigos alCargar={alCargarAmigos} />
        <RetosRankingSemanal alCargar={alCargarRanking} />
        <RetosHistorial alCargar={alCargarHistorial} />
      </div>

      {!listos && !hayDatos && <EsqueletoLista cantidad={3} />}

      {listos && !hayDatos && hayError && (
        <EstadoError
          onReintentar={() => {
            setEstados({});
            setIntento((n) => n + 1);
          }}
        >
          No se pudieron cargar tus duelos.
        </EstadoError>
      )}

      {listos && !hayDatos && !hayError && (
        <EstadoVacio
          icono={Swords}
          titulo="Todavía no tienes duelos"
          accion={{ etiqueta: 'Buscar a quién retar', href: '/directorio' }}
        >
          Reta a alguien a ver quién sostiene la racha esta semana.
        </EstadoVacio>
      )}

      {hayDatos && (
        <p className="tenue retos-pagina-pie">
          ¿Buscas a alguien para retar?{' '}
          <Link href="/directorio">Explora el directorio</Link> o abre un perfil y pulsa «Retar».
        </p>
      )}
    </main>
  );
}
