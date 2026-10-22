import Link from 'next/link';

/**
 * Reglas publicas de la comunidad.
 *
 * El login promete "solo hay cinco lineas rojas" y la moderacion las aplica
 * (docs/moderacion.md, motivos de reporte del feed), pero no estaban escritas
 * en ningun lugar que un usuario pudiera leer antes de entrar. Las tiendas de
 * apps tambien lo exigen para cualquier app con contenido de usuarios.
 *
 * El orden de las lineas rojas es el mismo que el de los motivos de reporte.
 */
export default function Reglas() {
  return (
    <main className="tarjeta" style={{ maxWidth: 720 }}>
      <p style={{ marginTop: 0 }}>
        <Link href="/feed">← Volver</Link>
      </p>
      <h1>Reglas de la comunidad</h1>
      <p className="tenue">Última actualización: octubre 2026</p>

      <p>
        Ágora es para decir lo que piensas. Critica al profe, quéjate del comedor, búrlate del
        tráfico de la Recta. Todo eso se vale. Lo que no se vale cabe en cinco líneas.
      </p>

      <h2>Las cinco líneas rojas</h2>
      <ol>
        <li>
          <strong>Contenido íntimo sin permiso.</strong> Fotos o videos sexuales o de desnudos de
          alguien que no dio su consentimiento, aunque sea "de broma". Cero tolerancia.
        </li>
        <li>
          <strong>Datos personales de otros.</strong> Teléfono, dirección, cuarto del colegio,
          matrícula, horarios o capturas de chats privados de alguien que no quiere que se sepan.
        </li>
        <li>
          <strong>Amenazas de violencia.</strong> Contra una persona, un grupo o el campus. Tampoco
          "en broma".
        </li>
        <li>
          <strong>Acoso dirigido.</strong> Insistir contra una persona concreta: humillarla,
          organizar a otros para atacarla, burlarse de su cuerpo, origen, género u orientación.
          Criticar lo que alguien hace se vale; ir contra quien es, no.
        </li>
        <li>
          <strong>Suplantación.</strong> Hacerte pasar por otra persona, por un profesor o por
          una cuenta oficial de la universidad.
        </li>
      </ol>
      <p>
        Además, lo que ya es ilegal fuera también lo es aquí: vender drogas o armas, fraudes,
        contenido sexual con menores (se reporta a las autoridades).
      </p>

      <h2>Cómo se modera</h2>
      <ul>
        <li>
          Cualquiera puede reportar una publicación, un comentario, un mensaje o un perfil desde
          «…». Una persona del equipo revisa cada reporte en menos de 24 horas, y si cruza una
          línea roja lo retira.
        </li>
        <li>
          Si una publicación tuya se retira, ves el motivo. Puede ser un error: escríbenos y la
          revisamos.
        </li>
        <li>
          Quien cruza las líneas rojas de forma grave o repetida pierde la cuenta. Una suspensión
          solo la levanta el equipo de moderación.
        </li>
      </ul>

      <h2>La zona anónima</h2>
      <p>
        Nadie ve tu nombre, pero Ágora sí lo sabe. El anonimato es frente a otros usuarios, no
        frente a nosotros ni frente a una autoridad que lo pida conforme a la ley. Las mismas
        cinco líneas rojas aplican, y ahí se revisan con más cuidado.
      </p>

      <h2>Aventones y marketplace</h2>
      <p>
        Ágora solo conecta a personas de la comunidad; no organiza los viajes ni las ventas y no
        responde por ellos. Antes de subirte a un aventón, comparte con alguien a dónde vas y con
        quién. En el marketplace, entrega y paga en persona dentro del campus y desconfía de
        quien te pida adelantos. Si algo sale mal, repórtalo.
      </p>

      <h2>Cómo reportar</h2>
      <p>
        Cada publicación y cada comentario tienen la opción <strong>Reportar</strong>. Elige el
        motivo; quien publicó no sabe quién lo reportó. También puedes <strong>bloquear</strong>{' '}
        a alguien: no podrá escribirte, seguirte ni mandarte avisos.
      </p>
      <p>
        Si alguien está en peligro, no esperes a la app: llama al 911.
      </p>

      <p className="tenue">
        Estas reglas forman parte de los <Link href="/terminos">Términos de uso</Link>. Lo que
        hacemos con tus datos está en el <Link href="/privacidad">Aviso de privacidad</Link>.
      </p>
    </main>
  );
}
