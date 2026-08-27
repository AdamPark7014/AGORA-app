/** Placeholders animados mientras llegan datos — mejor que un spinner genérico. */

function EsqueletoBarra({
  ancho = '100%',
  alto = 13,
  className,
}: {
  ancho?: string | number;
  alto?: number;
  className?: string;
}) {
  return (
    <div
      className={['esqueleto', className].filter(Boolean).join(' ')}
      style={{ width: ancho, height: alto }}
      aria-hidden="true"
    />
  );
}

export function EsqueletoTarjetaFeed() {
  return (
    <div className="tarjeta esqueleto-tarjeta" aria-hidden="true">
      <div className="esqueleto-cabeza">
        <div className="esqueleto esqueleto-avatar" />
        <div className="esqueleto-identidad">
          <EsqueletoBarra ancho="42%" />
          <EsqueletoBarra ancho="28%" alto={11} />
        </div>
        <EsqueletoBarra ancho={72} alto={24} className="esqueleto-etiqueta" />
      </div>
      <EsqueletoBarra ancho="94%" />
      <EsqueletoBarra ancho="76%" />
      <EsqueletoBarra ancho="52%" />
    </div>
  );
}

export function EsqueletoFeed({ cantidad = 2 }: { cantidad?: number }) {
  return (
    <div className="esqueleto-lista" aria-busy="true" aria-label="Cargando publicaciones">
      {Array.from({ length: cantidad }, (_, i) => (
        <EsqueletoTarjetaFeed key={i} />
      ))}
    </div>
  );
}

export function EsqueletoPerfil() {
  return (
    <div className="esqueleto-perfil" aria-busy="true" aria-label="Cargando perfil">
      <div className="tarjeta esqueleto-tarjeta">
        <EsqueletoBarra ancho="100%" alto={120} className="esqueleto-portada" />
        <div className="esqueleto-cabeza" style={{ marginTop: 14 }}>
          <div className="esqueleto esqueleto-avatar esqueleto-avatar-grande" />
          <div className="esqueleto-identidad">
            <EsqueletoBarra ancho="55%" alto={18} />
            <EsqueletoBarra ancho="35%" alto={12} />
          </div>
        </div>
        <EsqueletoBarra ancho="88%" />
        <EsqueletoBarra ancho="62%" />
        <div className="esqueleto-cifras">
          <EsqueletoBarra ancho={56} alto={36} className="esqueleto-etiqueta" />
          <EsqueletoBarra ancho={56} alto={36} className="esqueleto-etiqueta" />
          <EsqueletoBarra ancho={56} alto={36} className="esqueleto-etiqueta" />
        </div>
      </div>
      <EsqueletoTarjetaFeed />
    </div>
  );
}

export function EsqueletoLista({ cantidad = 3 }: { cantidad?: number }) {
  return (
    <div className="esqueleto-lista" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="tarjeta esqueleto-tarjeta" aria-hidden="true">
          <div className="esqueleto-cabeza">
            <div className="esqueleto esqueleto-avatar" />
            <div className="esqueleto-identidad">
              <EsqueletoBarra ancho="50%" />
              <EsqueletoBarra ancho="35%" alto={11} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
