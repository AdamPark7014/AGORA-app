/**
 * Plantilla del correo con el codigo de acceso.
 *
 * Reglas que vienen de como funcionan los clientes de correo de verdad:
 *
 *  - Todo el CSS va en linea. Gmail y Outlook descartan <style> en <head>,
 *    asi que una hoja de estilos separada no llega.
 *  - Siempre hay version de texto plano. No es un extra: los filtros de spam
 *    penalizan los correos que solo traen HTML, y aqui la entregabilidad es
 *    el producto — si el correo no llega, nadie entra.
 *  - El codigo aparece tambien en el asunto. Los clientes de movil muestran
 *    el asunto en la notificacion, asi que muchos usuarios ni abren el correo.
 *  - Nada de imagenes remotas. Se bloquean por defecto y dejarian el correo
 *    sin identidad justo en el primer contacto.
 */

export interface ContenidoCorreo {
  readonly asunto: string;
  readonly html: string;
  readonly texto: string;
}

/** Paleta institucional UDLAP, en linea porque el correo no carga CSS externo. */
const NARANJA = '#e35205';
const NARANJA_HONDO = '#b83f02';
const TEXTO = '#1b2420';
const TENUE = '#7a847f';
const PAPEL = '#fdfbf7';
const BORDE = '#e6ded1';

/**
 * Credito del desarrollador. Coincide con el dominio del remitente de
 * produccion (MAIL_FROM en contacto@zynoratek.com), asi que el
 * unico enlace del correo apunta al mismo dominio que lo firma: un enlace a un
 * dominio ajeno al remitente es de lo que mas pesa en los filtros.
 */
const URL_ZYNORA = 'https://zynoratek.com';

export interface OpcionesPlantilla {
  /** Minutos de vigencia, para decirlo en el cuerpo sin codificarlo dos veces. */
  readonly minutos: number;
  /** Nombre del producto. Parametrizado porque la marca aun no es definitiva. */
  readonly marca?: string;
}

export const plantillaCodigo = (
  codigo: string,
  { minutos, marca = 'Ágora' }: OpcionesPlantilla,
): ContenidoCorreo => {
  const asunto = `${codigo} es tu código de ${marca}`;

  const texto = [
    `Tu código para entrar a ${marca} es: ${codigo}`,
    '',
    `Vence en ${minutos} minutos y solo sirve una vez.`,
    '',
    'Si no lo pediste, ignora este correo: alguien escribió tu dirección por error.',
    'Nadie puede entrar a tu cuenta sin este código.',
    '',
    `${marca} no está afiliada a la Universidad de las Américas Puebla.`,
    `Developed by Zynora Tek · ${URL_ZYNORA}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:24px;background:${PAPEL};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXTO};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;margin:0 auto;">
    <tr><td style="padding-bottom:20px;">
      <span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:9px;background:${NARANJA};color:#fff;font-weight:700;font-size:16px;">Á</span>
      <span style="font-size:20px;font-weight:700;letter-spacing:-0.02em;margin-left:8px;vertical-align:middle;">${marca}</span>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid ${BORDE};border-radius:14px;padding:28px 24px;">
      <p style="margin:0 0 6px;font-size:15px;color:${TENUE};">Tu código para entrar:</p>
      <p style="margin:0 0 18px;font-size:38px;font-weight:700;letter-spacing:0.14em;color:${NARANJA_HONDO};font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">${codigo}</p>
      <p style="margin:0;font-size:15px;line-height:1.6;">Vence en <strong>${minutos} minutos</strong> y solo sirve una vez.</p>
    </td></tr>
    <tr><td style="padding-top:20px;font-size:13px;line-height:1.6;color:${TENUE};">
      <p style="margin:0 0 10px;">Si no lo pediste, ignora este correo: alguien escribió tu dirección por error. Nadie puede entrar a tu cuenta sin este código.</p>
      <p style="margin:0 0 14px;">${marca} no está afiliada a la Universidad de las Américas Puebla.</p>
      <p style="margin:0;padding-top:14px;border-top:1px solid ${BORDE};font-size:12px;">Developed by <a href="${URL_ZYNORA}" style="color:${TENUE};font-weight:600;text-decoration:none;">Zynora Tek</a></p>
    </td></tr>
  </table>
</body>
</html>`;

  return { asunto, html, texto };
};
