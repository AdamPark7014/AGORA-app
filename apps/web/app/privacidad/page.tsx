import Link from 'next/link';

import { CORREO_CONTACTO } from '@/lib/contacto';

/**
 * Aviso de privacidad.
 *
 * App Store (etiqueta de privacidad) y Google Play (Seguridad de los datos)
 * comparan sus respuestas con esta página: lo que diga aquí tiene que coincidir
 * con docs/tienda/README.md y con `PrivacyInfo.xcprivacy`. Si la app empieza a
 * recoger algo nuevo, cambia las tres cosas en el mismo commit.
 */
export default function Privacidad() {
  return (
    <main className="tarjeta" style={{ maxWidth: 720 }}>
      <p style={{ marginTop: 0 }}>
        <Link href="/">← Volver</Link>
      </p>
      <h1>Aviso de privacidad</h1>
      <p className="tenue">Última actualización: 22 de octubre de 2026</p>

      <p>
        Ágora es una red social independiente para la comunidad de la UDLAP, desarrollada por Zynora
        Tek. No está afiliada a la Universidad de las Américas Puebla. Para cualquier tema de tus
        datos escríbenos a <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>.
      </p>

      <h2>Qué datos recogemos</h2>
      <ul>
        <li>
          <strong>Cuenta:</strong> tu correo @udlap.mx y tu contraseña (guardada cifrada con argon2id;
          nadie del equipo puede leerla). Si el código a tu correo UDLAP no llega, puedes registrarte
          con un correo personal mientras lo confirmas; ese correo se borra en cuanto confirmas el de
          la UDLAP.
        </li>
        <li>
          <strong>Perfil:</strong> nombre, apellidos y nombre de usuario. Si tú los agregas: foto,
          portada, bio, carrera, generación, colegio residencial, ciudad de origen, usuario de
          Instagram, intereses, lo que buscas y cumpleaños sin año.
        </li>
        <li>
          <strong>Lo que publicas:</strong> publicaciones, fotos y videos, comentarios, reacciones,
          votos en encuestas, mensajes directos, anuncios del mercado, eventos y aventones (el origen
          y el destino son texto que tú escribes; no usamos tu ubicación).
        </li>
        <li>
          <strong>Uso de la app:</strong> a quién sigues y bloqueas, lo que guardas, comunidades,
          rachas e insignias, y la última vez que entraste.
        </li>
        <li>
          <strong>Datos técnicos:</strong> dirección IP y tipo de navegador o teléfono (para limitar
          intentos y cuidar tu cuenta), cookies de sesión y, si aceptas avisos, el identificador de
          notificaciones de tu teléfono o navegador.
        </li>
      </ul>
      <p>
        No pedimos ni guardamos tu ubicación, tus contactos, tu calendario ni tu micrófono. La app no
        tiene publicidad, no usa rastreadores de terceros y no vendemos tus datos.
      </p>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Verificar que eres de la comunidad UDLAP y mantener tu sesión.</li>
        <li>Mostrarte el feed, tus comunidades, eventos, aventones, mercado y mensajes.</li>
        <li>Mandarte avisos que tú eliges (respuestas, mensajes, eventos a los que vas).</li>
        <li>Moderar lo que se reporta y proteger a la comunidad de abusos.</li>
      </ul>

      <h2>Quién más los ve</h2>
      <p>
        Tu perfil lo ve la comunidad verificada: toda la UDLAP o solo quien comparte comunidad contigo,
        según elijas en Ajustes. Las publicaciones de la zona anónima no muestran tu nombre a otros
        usuarios; el equipo de moderación sí puede ligarlas a tu cuenta para hacer cumplir las reglas.
      </p>
      <p>Usamos estos proveedores, solo para que el servicio funcione:</p>
      <ul>
        <li>Hetzner Online: el servidor donde viven la base de datos y tus fotos (Estados Unidos).</li>
        <li>Cloudflare: entrega la página de forma segura (HTTPS).</li>
        <li>Brevo: envía los correos con tu código de acceso.</li>
        <li>
          Google Firebase Cloud Messaging, Apple Push Notification service y el servicio de avisos
          de tu navegador: entregan las notificaciones en Android, iPhone y la web.
        </li>
      </ul>
      <p>
        No compartimos tus datos con nadie más, salvo que una autoridad competente lo pida conforme a
        la ley.
      </p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>
        Mientras tengas cuenta. Si la eliminas, borramos al momento tu perfil, tu correo, tu
        contraseña, tus sesiones y tus archivos, y lo que publicaste deja de verse. Solo conservamos
        un identificador cifrado de tu correo en el registro de auditoría y lo que esté bajo un
        reporte abierto hasta que se resuelva. Detalle en{' '}
        <Link href="/eliminar-cuenta">cómo eliminar tu cuenta</Link>.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes ver y corregir tus datos en Ajustes, cambiar quién ve tu perfil, apagar avisos,
        bloquear a quien quieras y eliminar tu cuenta desde la app. Para acceder, rectificar, cancelar
        u oponerte al uso de tus datos (derechos ARCO) escríbenos a{' '}
        <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a> desde tu correo; respondemos en un
        máximo de 20 días hábiles.
      </p>

      <h2>Edad</h2>
      <p>
        Ágora es para estudiantes universitarios. No está dirigida a menores de 13 años y no
        recogemos a sabiendas datos de ellos.
      </p>

      <p className="tenue" style={{ marginTop: 28 }}>
        <Link href="/terminos">Términos</Link> · <Link href="/reglas">Reglas de la comunidad</Link> ·{' '}
        <Link href="/soporte">Soporte</Link>
      </p>
    </main>
  );
}
