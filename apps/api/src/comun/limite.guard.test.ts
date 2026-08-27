import assert from 'node:assert/strict';
import { test } from 'node:test';

import { claveDeLimite } from './limite.guard.js';
import type { RequestConSesion } from './sesion.guard.js';

/** Construye lo minimo de un Request que mira `claveDeLimite`. */
const pedir = (opciones: {
  cookie?: string;
  bearer?: string;
  ip?: string;
  ips?: string[];
}): RequestConSesion =>
  ({
    cookies: opciones.cookie ? { agora_sesion: opciones.cookie } : {},
    headers: opciones.bearer ? { authorization: `Bearer ${opciones.bearer}` } : {},
    ip: opciones.ip,
    ips: opciones.ips,
  }) as unknown as RequestConSesion;

test('dos personas detras del mismo NAT no comparten cupo', () => {
  // Este es el caso que rompia la app: en el campus todo el mundo sale por la
  // misma IP, y contando por IP el primero que navega deja sin cupo al resto.
  const nat = '148.228.0.1';
  const ana = claveDeLimite(pedir({ cookie: 'token-de-ana', ip: nat }));
  const luis = claveDeLimite(pedir({ cookie: 'token-de-luis', ip: nat }));

  assert.notEqual(ana, luis);
});

test('la misma persona cuenta igual venga por cookie o por Bearer', () => {
  // La web manda cookie y la app nativa Bearer. Es la misma cuenta y el mismo
  // cupo; si no, alguien duplicaria su limite abriendo la app.
  const token = 'un-token-cualquiera';
  assert.equal(
    claveDeLimite(pedir({ cookie: token, ip: '1.2.3.4' })),
    claveDeLimite(pedir({ bearer: token, ip: '9.9.9.9' })),
  );
});

test('la clave nunca contiene el token en claro', () => {
  // La clave acaba en la memoria del limitador y en mensajes de depuracion.
  const token = 'secreto-de-sesion-en-claro';
  const clave = claveDeLimite(pedir({ cookie: token }));

  assert.ok(!clave.includes(token), 'el token no debe viajar en la clave');
  assert.ok(clave.startsWith('s:'));
});

test('sin sesion se cuenta por IP', () => {
  const clave = claveDeLimite(pedir({ ip: '203.0.113.7' }));
  assert.equal(clave, 'ip:203.0.113.7');
});

test('detras de proxy manda la IP del cliente, no la del proxy', () => {
  // Con TRUST_PROXY=true Express llena `ips` con la cadena real. Si se usara
  // `req.ip` ahi, todo el trafico contaria como una sola IP: la de Traefik.
  const clave = claveDeLimite(pedir({ ips: ['198.51.100.5', '10.0.0.1'], ip: '10.0.0.1' }));
  assert.equal(clave, 'ip:198.51.100.5');
});

test('una peticion sin IP reconocible sigue teniendo clave', () => {
  // Nunca debe devolver vacio: una clave vacia junta a todos los anonimos en
  // el mismo cubo, que es el fallo que se esta arreglando.
  const clave = claveDeLimite(pedir({}));
  assert.equal(clave, 'ip:desconocida');
});
