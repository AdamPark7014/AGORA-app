import Link from 'next/link';

import { CORREO_CONTACTO } from '@/lib/contacto';

/**
 * Página pública de soporte.
 *
 * App Store Connect y Google Play piden una URL de soporte con forma de
 * contacto que se pueda abrir sin cuenta. Responde lo que de verdad preguntan
 * los estudiantes: el código que no llega y la contraseña olvidada.
 */
export default function Soporte() {
  return (
    <main className="tarjeta" style={{ maxWidth: 720 }}>
      <p style={{ marginTop: 0 }}>
        <Link href="/">← Volver</Link>
      </p>
      <h1>Soporte</h1>
      <p>
        ¿Algo no funciona o tienes una duda? Escríbenos a{' '}
        <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a> desde tu correo y te
        respondemos en uno o dos días hábiles. Si es sobre una publicación o una persona, mejor
        repórtala desde la app: llega directo a moderación.
      </p>

      <h2>Entrar a Ágora</h2>
      <ul>
        <li>
          <strong>Primera vez:</strong> en la app o en udlagora.com toca «Crea tu cuenta», escribe tu
          correo @udlap.mx y te mandamos un código de 6 dígitos. Solo se pide esta vez; luego
          eliges una contraseña.
        </li>
        <li>
          <strong>El código no llega:</strong> Outlook de la UDLAP a veces tarda unos minutos. Revisa
          Correo no deseado y la pestaña Otros, y busca «Zynora» o «Ágora». El código dura 15
          minutos y puedes pedir otro después de un minuto.
        </li>
        <li>
          <strong>Olvidaste tu contraseña:</strong> toca «¿Olvidaste tu contraseña?», te mandamos un
          código a tu correo @udlap.mx y eliges una nueva. Tus otras sesiones se cierran.
        </li>
        <li>
          <strong>Muchos intentos:</strong> después de cinco contraseñas equivocadas la entrada con
          contraseña se pausa 15 minutos. Con el código al correo puedes entrar antes.
        </li>
      </ul>

      <h2>Tu cuenta</h2>
      <ul>
        <li>
          Cambia tu contraseña, tu foto, quién ve tu perfil y qué avisos recibes en{' '}
          <strong>Ajustes</strong>.
        </li>
        <li>
          Para borrar tu cuenta: <Link href="/eliminar-cuenta">cómo eliminar tu cuenta</Link>.
        </li>
      </ul>

      <h2>Seguridad y moderación</h2>
      <ul>
        <li>
          En cualquier publicación, comentario, mensaje o perfil toca «…» y luego «Reportar».
          También puedes bloquear o silenciar a una persona.
        </li>
        <li>
          Lo que se vale y lo que no: <Link href="/reglas">reglas de la comunidad</Link>.
        </li>
      </ul>

      <p className="tenue" style={{ marginTop: 28 }}>
        Ágora es un proyecto independiente y no está afiliada a la Universidad de las Américas
        Puebla. <Link href="/privacidad">Aviso de privacidad</Link> ·{' '}
        <Link href="/terminos">Términos</Link>
      </p>
    </main>
  );
}
