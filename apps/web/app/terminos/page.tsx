import Link from 'next/link';

export default function Terminos() {
  return (
    <main className="tarjeta" style={{ maxWidth: 720 }}>
      <p style={{ marginTop: 0 }}>
        <Link href="/feed">← Volver</Link>
      </p>
      <h1>Términos de uso</h1>
      <p className="tenue">Última actualización: agosto 2026</p>

      <h2>Qué es Ágora</h2>
      <p>
        Ágora es una red social independiente para la comunidad verificada de la UDLAP.
        No está afiliada ni respaldada oficialmente por la universidad.
      </p>

      <h2>Quién puede usarla</h2>
      <p>
        Solo personas con correo <code>@udlap.mx</code> verificado. Al registrarte confirmas
        que eres parte de esa comunidad y que la información que das es veraz.
      </p>

      <h2>Contenido permitido</h2>
      <p>
        Publica con respeto. Está prohibido el acoso, las amenazas, compartir datos personales
        de terceros sin permiso, contenido íntimo sin consentimiento y la suplantación de identidad.
        El equipo de moderación puede retirar publicaciones que violen estas reglas. El detalle
        está en las <Link href="/reglas">Reglas de la comunidad</Link>.
      </p>

      <h2>Tu responsabilidad</h2>
      <p>
        Eres responsable de lo que publicas. Ágora puede suspender cuentas que abusen de la
        plataforma o pongan en riesgo a otros miembros.
      </p>

      <h2>Disponibilidad</h2>
      <p>
        El servicio se ofrece &quot;tal cual&quot;, sin garantías. Podemos cambiar funciones o
        interrumpir el servicio con aviso razonable cuando sea posible.
      </p>

      <h2>Contacto</h2>
      <p>
        Dudas sobre estos términos: escríbenos desde tu cuenta a moderación o al equipo en
        el campus.
      </p>
    </main>
  );
}
