/**
 * Isotipo de Ágora: la pirámide de Cholula, de cinco gradas, sobre naranja
 * (concepto «Mono», elegido el 21-10-2026). Fuente única:
 * scripts/generar-icono.mjs, que también produce los íconos de Android e iOS.
 *
 * Es una <img> del mismo /icono.svg que usan la PWA y el favicon, no un SVG en
 * linea: el icono trae degradados y una sombra con ids propios, y varias copias
 * en linea en la misma pagina chocarian por id. Como archivo estatico ademas
 * vive en la cache del service worker. El tamano lo pone la clase.
 */
export function Isotipo({ className = 'marca-punto' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icono.svg"
      alt=""
      aria-hidden="true"
      className={className}
      width={30}
      height={30}
      decoding="async"
    />
  );
}
