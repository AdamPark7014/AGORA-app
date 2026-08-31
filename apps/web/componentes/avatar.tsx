/**
 * Avatar de iniciales.
 *
 * Hasta que exista subida de fotos, cada persona necesita algo que la
 * distinga en una lista. Se usa la paleta UDLAP y el color se elige de forma
 * determinista a partir del handle: la misma persona sale siempre del mismo
 * color, en cualquier pantalla y sin guardar nada.
 */

import Image from 'next/image';

const COLORES = [
  '#e35205', // naranja 166 C
  '#154734', // verde 3435 C
  '#008675', // aqua 327 C
  '#8b6f4e', // oro 874 C
  '#b83f02',
  '#2a6b52',
] as const;

/** Suma simple de codigos: estable entre servidor y cliente, sin dependencias. */
function colorDe(semilla: string): string {
  let acumulado = 0;
  for (let i = 0; i < semilla.length; i += 1) acumulado = (acumulado + semilla.charCodeAt(i)) % 997;
  return COLORES[acumulado % COLORES.length]!;
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return (partes[0]![0]! + partes[partes.length - 1]![0]!).toUpperCase();
}

export function Avatar({
  nombre,
  semilla,
  tamano = 'normal',
  fotoUrl,
  anillo,
  verificado,
}: {
  nombre: string;
  /** Normalmente el handle. Si falta se usa el nombre. */
  semilla?: string;
  tamano?: 'chico' | 'normal' | 'grande';
  /** Si la persona subio foto, gana sobre las iniciales. */
  fotoUrl?: string | null;
  /** Ring de color por generación/carrera. */
  anillo?: 'naranja' | 'aqua' | 'oro' | 'verde';
  verificado?: boolean;
}) {
  const claseBase = tamano === 'normal' ? 'avatar' : `avatar ${tamano}`;
  const clase = [claseBase, anillo ? `avatar-anillo-${anillo}` : '', verificado ? 'avatar-verificado' : '']
    .filter(Boolean)
    .join(' ');
  const px = tamano === 'grande' ? 88 : tamano === 'chico' ? 30 : 42;
  const alt = `Foto de ${nombre}`;
  const sinOptimizar =
    !!fotoUrl &&
    (fotoUrl.startsWith('blob:') ||
      fotoUrl.startsWith('data:') ||
      fotoUrl.includes('localhost') ||
      fotoUrl.includes('127.0.0.1'));

  const contenido = fotoUrl ? (
    <Image
      className={claseBase}
      src={fotoUrl}
      alt={alt}
      width={px}
      height={px}
      style={{ objectFit: 'cover' }}
      unoptimized={sinOptimizar}
    />
  ) : (
    <span
      className={claseBase}
      style={{ background: colorDe(semilla ?? nombre) }}
      role="img"
      aria-label={nombre}
    >
      {iniciales(nombre)}
    </span>
  );

  if (!anillo && !verificado) return contenido;

  return <span className={clase}>{contenido}</span>;
}
