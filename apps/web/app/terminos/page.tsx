import Link from 'next/link';

import { CORREO_CONTACTO } from '@/lib/contacto';

export default function Terminos() {
  return (
    <main className="tarjeta" style={{ maxWidth: 720 }}>
      <p style={{ marginTop: 0 }}>
        <Link href="/">← Volver</Link>
      </p>
      <h1>Términos de uso</h1>
      <p className="tenue">Última actualización: 22 de octubre de 2026</p>

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

      <h2>Cero tolerancia</h2>
      <p>
        No hay tolerancia para el contenido ofensivo ni para quien abusa de otros. Cualquiera
        puede reportar una publicación, un comentario, un mensaje o un perfil, y bloquear a quien
        quiera. El equipo revisa cada reporte en menos de 24 horas: retira lo que cruza las
        reglas y suspende la cuenta de quien lo publicó cuando es grave o se repite.
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
        Dudas sobre estos términos: <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>.
        Ágora la desarrolla Zynora Tek.
      </p>
    </main>
  );
}
