export function EncabezadoPagina({
  titulo,
  entradilla,
  acciones,
}: {
  titulo: string;
  entradilla?: string;
  acciones?: React.ReactNode;
}) {
  return (
    <header className="pagina-cabecera">
      <div>
        <h1>{titulo}</h1>
        {entradilla && <p className="entradilla">{entradilla}</p>}
      </div>
      {acciones && <div className="pagina-acciones">{acciones}</div>}
    </header>
  );
}
