import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  buscarDirectorioSchema,
  crearPerfilSchema,
  crearPostSchema,
  crearReporteSchema,
  handleSchema,
  pushSubscriptionSchema,
  solicitarOtpSchema,
  verificarOtpSchema,
  entrarSchema,
  crearContrasenaSchema,
  cambiarContrasenaSchema,
} from './index.js';

test('solicitar OTP normaliza el correo y solo acepta @udlap.mx', () => {
  const ok = solicitarOtpSchema.parse({ email: '  ADAM.POZO@UDLAP.MX ' });
  assert.equal(ok.email, 'adam.pozo@udlap.mx');

  for (const email of ['alguien@gmail.com', 'alguien@udlap.mx.attacker.com', 'x@falsoudlap.mx']) {
    assert.equal(solicitarOtpSchema.safeParse({ email }).success, false, `deberia rechazar ${email}`);
  }
});

test('el codigo OTP son exactamente 6 digitos', () => {
  const base = { email: 'a@udlap.mx' };
  assert.equal(verificarOtpSchema.safeParse({ ...base, codigo: '123456' }).success, true);
  for (const codigo of ['12345', '1234567', 'abcdef', '12 34 56', '']) {
    assert.equal(
      verificarOtpSchema.safeParse({ ...base, codigo }).success,
      false,
      `deberia rechazar ${JSON.stringify(codigo)}`,
    );
  }
});

test('el handle acepta lo razonable y rechaza lo peligroso', () => {
  for (const h of ['adampozo', 'adam.pozo', 'adam_p7']) {
    assert.equal(handleSchema.safeParse(h).success, true, `deberia aceptar ${h}`);
  }
  const malos: Array<[string, string]> = [
    ['ab', 'muy corto'],
    ['7adam', 'empieza con numero'],
    ['160910', 'parece matricula'],
    ['adam pozo', 'espacio'],
    ['adam-pozo', 'guion medio'],
    ['admin', 'reservado'],
    ['moderacion', 'reservado'],
    ['udlap', 'reservado — no confundir con la institucion'],
  ];
  for (const [h, razon] of malos) {
    assert.equal(handleSchema.safeParse(h).success, false, `deberia rechazar ${h} (${razon})`);
  }
});

test('el handle se normaliza a minusculas', () => {
  assert.equal(handleSchema.parse('AdamPozo'), 'adampozo');
});

test('crear perfil exige lo minimo para caer en comunidades', () => {
  const valido = crearPerfilSchema.safeParse({
    handle: 'adampozo',
    nombre: 'Adam',
    apellidos: 'Pozo',
    generacion: 2024,
    carreraSlug: 'ing-sistemas-computacionales',
  });
  assert.equal(valido.success, true);

  // Sin carrera no hay comunidad de carrera ni de escuela: perfil inutil.
  assert.equal(
    crearPerfilSchema.safeParse({
      handle: 'adampozo',
      nombre: 'Adam',
      apellidos: 'Pozo',
      generacion: 2024,
    }).success,
    false,
  );
});

test('la generacion no puede ser del futuro lejano', () => {
  const base = {
    handle: 'adampozo',
    nombre: 'Adam',
    apellidos: 'Pozo',
    carreraSlug: 'derecho',
  };
  assert.equal(crearPerfilSchema.safeParse({ ...base, generacion: 2050 }).success, false);
  assert.equal(crearPerfilSchema.safeParse({ ...base, generacion: 1990 }).success, false);
});

test('una encuesta necesita al menos dos opciones distintas', () => {
  const base = { comunidadSlug: 'carrera:derecho', texto: 'que opinan' };
  assert.equal(
    crearPostSchema.safeParse({
      ...base,
      encuesta: { pregunta: 'cual?', opciones: ['a', 'b'] },
    }).success,
    true,
  );
  assert.equal(
    crearPostSchema.safeParse({
      ...base,
      encuesta: { pregunta: 'cual?', opciones: ['a'] },
    }).success,
    false,
    'una sola opcion no es encuesta',
  );
  assert.equal(
    crearPostSchema.safeParse({
      ...base,
      encuesta: { pregunta: 'cual?', opciones: ['a', 'a'] },
    }).success,
    false,
    'opciones repetidas',
  );
});

test('un post vacio o de puros espacios se rechaza', () => {
  assert.equal(
    crearPostSchema.safeParse({ comunidadSlug: 'carrera:derecho', texto: '   ' }).success,
    false,
  );
});

test('un reporte apunta a una publicacion o a un comentario, nunca a ambos', () => {
  assert.equal(
    crearReporteSchema.safeParse({ postId: 'p1', motivo: 'ACOSO_DIRIGIDO' }).success,
    true,
  );
  assert.equal(
    crearReporteSchema.safeParse({ commentId: 'c1', motivo: 'OTRO' }).success,
    true,
  );
  assert.equal(
    crearReporteSchema.safeParse({ postId: 'p1', commentId: 'c1', motivo: 'OTRO' }).success,
    false,
  );
  assert.equal(crearReporteSchema.safeParse({ motivo: 'OTRO' }).success, false);
});

test('el directorio trae limite por defecto y lo acota', () => {
  assert.equal(buscarDirectorioSchema.parse({}).limite, 20);
  assert.equal(buscarDirectorioSchema.parse({ limite: '35' }).limite, 35);
  assert.equal(buscarDirectorioSchema.safeParse({ limite: 500 }).success, false);
});

test('push: solo servicios de push reales, nunca hosts internos', () => {
  const llaves = { p256dh: 'x', auth: 'y' };
  const ok = (endpoint: string) => pushSubscriptionSchema.safeParse({ endpoint, keys: llaves }).success;

  assert.ok(ok('https://fcm.googleapis.com/fcm/send/abc'));
  assert.ok(ok('https://updates.push.services.mozilla.com/wpush/v2/abc'));
  assert.ok(ok('https://web.push.apple.com/abc'));
  assert.ok(ok('https://wns2-by3p.notify.windows.com/w/?token=abc'));

  assert.ok(!ok('http://redis:6379/'));
  assert.ok(!ok('http://fcm.googleapis.com/fcm/send/abc'));
  assert.ok(!ok('https://10.0.0.5/'));
  assert.ok(!ok('https://fcm.googleapis.com:8443/x'));
  assert.ok(!ok('https://fcm.googleapis.com.evil.com/x'));
  assert.ok(!ok('https://evilnotify.windows.com.attacker.io/x'));
});

test('entrar normaliza el correo y recuerda por omision', () => {
  const ok = entrarSchema.parse({ email: ' Ana.R@UDLAP.MX ', contrasena: 'lo-que-sea' });
  assert.equal(ok.email, 'ana.r@udlap.mx');
  assert.equal(ok.modo, 'cookie');
  assert.equal(ok.recordarme, true);
  assert.equal(entrarSchema.safeParse({ email: 'a@udlap.mx', contrasena: '' }).success, false);
  assert.equal(entrarSchema.safeParse({ email: 'a@gmail.com', contrasena: 'x' }).success, false);
});

test('la contraseña nueva mide entre 8 y 128', () => {
  assert.equal(crearContrasenaSchema.safeParse({ contrasena: 'siete77' }).success, false);
  assert.equal(crearContrasenaSchema.safeParse({ contrasena: 'ocho-888' }).success, true);
  assert.equal(crearContrasenaSchema.safeParse({ contrasena: 'x'.repeat(129) }).success, false);
  assert.equal(cambiarContrasenaSchema.safeParse({ actual: '', nueva: 'ocho-888' }).success, false);
  assert.equal(cambiarContrasenaSchema.safeParse({ actual: 'vieja', nueva: 'ocho-888' }).success, true);
});

test('registro con correo personal: otro dominio, nunca la UDLAP', async () => {
  const { solicitarOtpPersonalSchema, verificarOtpPersonalSchema } = await import('./index.js');
  const ok = solicitarOtpPersonalSchema.parse({
    email: ' Ana.R@UDLAP.MX ',
    correoPersonal: ' Ana.Ramirez@Gmail.com ',
  });
  assert.equal(ok.email, 'ana.r@udlap.mx');
  assert.equal(ok.correoPersonal, 'ana.ramirez@gmail.com');
  assert.equal(
    solicitarOtpPersonalSchema.safeParse({ email: 'a@udlap.mx', correoPersonal: 'otra@udlap.mx' }).success,
    false,
    'el personal no puede ser de la UDLAP',
  );
  assert.equal(
    solicitarOtpPersonalSchema.safeParse({ email: 'a@udlap.mx', correoPersonal: 'sin-arroba' }).success,
    false,
  );
  assert.equal(
    solicitarOtpPersonalSchema.safeParse({ email: 'a@gmail.com', correoPersonal: 'b@gmail.com' }).success,
    false,
    'la cuenta sigue siendo un correo UDLAP',
  );
  const v = verificarOtpPersonalSchema.parse({
    email: 'a@udlap.mx',
    correoPersonal: 'b@gmail.com',
    codigo: '123456',
    modo: 'token',
  });
  assert.equal(v.modo, 'token');
});
