import Link from 'next/link';

export default function Privacidad() {
  return (
    <main className="tarjeta" style={{ maxWidth: 720 }}>
      <p style={{ marginTop: 0 }}>
        <Link href="/feed">← Volver</Link>
      </p>
      <h1>Política de privacidad</h1>
      <p className="tenue">Última actualización: agosto 2026</p>

      <h2>Datos que recopilamos</h2>
      <ul>
        <li>Correo institucional y nombre para verificar tu identidad.</li>
        <li>Perfil opcional: foto, bio, intereses, cumpleaños (sin año).</li>
        <li>Publicaciones, mensajes, reacciones y actividad en la plataforma.</li>
        <li>Datos técnicos básicos: IP, navegador, cookies de sesión.</li>
      </ul>

      <h2>Para qué los usamos</h2>
      <p>
        Para operar la red: autenticarte, mostrar el feed, enviar notificaciones relevantes,
        moderar contenido reportado y mejorar la experiencia. No vendemos tus datos.
      </p>

      <h2>Visibilidad</h2>
      <p>
        Puedes restringir tu perfil a quien comparta comunidad contigo. Las publicaciones
        anónimas no muestran tu identidad a otros usuarios, aunque el equipo de moderación
        puede asociarlas a tu cuenta para hacer cumplir las reglas.
      </p>

      <h2>Conservación</h2>
      <p>
        Guardamos tu información mientras tengas cuenta activa. Si solicitas borrar tu cuenta,
        eliminamos o anonimizamos lo que la ley nos permita en un plazo razonable.
      </p>

      <h2>Terceros</h2>
      <p>
        Usamos proveedores de infraestructura (servidor, correo transaccional) bajo contrato.
        Solo compartimos lo mínimo necesario para prestar el servicio.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes actualizar tu perfil en Ajustes, silenciar comunidades, bloquear usuarios y
        solicitar la eliminación de tu cuenta contactando al equipo.
      </p>
    </main>
  );
}
