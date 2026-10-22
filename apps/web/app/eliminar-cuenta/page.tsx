import Link from 'next/link';

import { CORREO_CONTACTO } from '@/lib/contacto';

/**
 * Cómo eliminar la cuenta, sin necesidad de entrar.
 *
 * Google Play exige una URL pública con los pasos para pedir el borrado de la
 * cuenta y de los datos (Seguridad de los datos → Eliminación de datos). Lo que
 * dice aquí es lo que hace `CuentaService.eliminar` en el API: anonimizar la
 * fila, borrar perfil, sesiones, seguimientos y archivos, y ocultar lo
 * publicado. Si cambia ese servicio, cambia esta página.
 */
export default function EliminarCuenta() {
  return (
    <main className="tarjeta" style={{ maxWidth: 720 }}>
      <p style={{ marginTop: 0 }}>
        <Link href="/">← Volver</Link>
      </p>
      <h1>Eliminar tu cuenta</h1>

      <h2>Desde la app o la web</h2>
      <ol>
        <li>Entra a Ágora con tu correo @udlap.mx y tu contraseña.</li>
        <li>
          Ve a <strong>Ajustes</strong> y baja hasta <strong>Eliminar mi cuenta</strong>.
        </li>
        <li>Escribe tu nombre de usuario para confirmar y toca «Eliminar definitivamente».</li>
      </ol>
      <p>
        Se hace al momento y no se puede deshacer. Si después quieres volver, puedes registrarte
        otra vez con el mismo correo.
      </p>

      <h2>Si no puedes entrar</h2>
      <p>
        Escríbenos desde tu correo @udlap.mx a{' '}
        <a href={`mailto:${CORREO_CONTACTO}?subject=Eliminar%20mi%20cuenta`}>{CORREO_CONTACTO}</a>{' '}
        con el asunto «Eliminar mi cuenta». La borramos en un máximo de 30 días y te confirmamos por
        correo.
      </p>

      <h2>Qué se borra</h2>
      <ul>
        <li>Tu perfil completo: nombre, foto, portada, bio, intereses y cumpleaños.</li>
        <li>Tu correo (queda libre para registrarte de nuevo) y tu contraseña.</li>
        <li>Tus sesiones, avisos, preferencias, rachas, insignias y suscripciones a notificaciones.</li>
        <li>Tus seguimientos, bloqueos, guardados y lugares apartados en aventones y eventos.</li>
        <li>Tus fotos y videos se borran del almacenamiento.</li>
        <li>
          Tus publicaciones, comentarios, mensajes, anuncios, eventos y aventones dejan de verse en
          toda la app.
        </li>
      </ul>

      <h2>Qué se conserva y por cuánto</h2>
      <p>
        Para atender reportes y requerimientos legales guardamos un identificador cifrado de tu
        correo (no el correo) en el registro de auditoría, y lo que esté bajo un reporte de
        moderación abierto hasta que se resuelva.
      </p>

      <p className="tenue" style={{ marginTop: 28 }}>
        <Link href="/privacidad">Aviso de privacidad</Link> · <Link href="/soporte">Soporte</Link>
      </p>
    </main>
  );
}
