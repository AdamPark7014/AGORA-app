'use client';

import { usePathname } from 'next/navigation';

import { esRutaPublica } from '@/lib/rutas';

/** Disclaimer solo en rutas públicas — no ensucia pantallas autenticadas. */
export function AvisoLegal() {
  const ruta = usePathname();
  if (!esRutaPublica(ruta)) return null;

  return (
    <p className="aviso">
      <strong>Ágora no está afiliada a la Universidad de las Américas Puebla.</strong> Es un
      proyecto independiente hecho por estudiantes. Los colores se inspiran en la identidad de
      la UDLAP; el escudo y el nombre de la institución son suyos y no se usan aquí.{' '}
      <a href="/terminos">Términos</a> · <a href="/privacidad">Privacidad</a>
      <br />
      Developed by{' '}
      <a href="https://zynoratek.com" target="_blank" rel="noopener">
        Zynora Tek
      </a>
    </p>
  );
}
