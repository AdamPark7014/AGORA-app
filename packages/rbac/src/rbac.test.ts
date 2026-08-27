import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  ALL_ROLES,
  PERMISSIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  algunRolTienePermiso,
  esRolValido,
  tienePermiso,
} from './index.js';

test('todos los roles tienen etiqueta y tabla de permisos', () => {
  for (const rol of ALL_ROLES) {
    assert.ok(ROLE_LABELS[rol], `sin etiqueta: ${rol}`);
    assert.ok(Array.isArray(ROLE_PERMISSIONS[rol]), `sin permisos: ${rol}`);
  }
});

test('un miembro verificado puede publicar y reportar', () => {
  assert.equal(tienePermiso('miembro', PERMISSIONS.PUBLICACION_CREAR), true);
  assert.equal(tienePermiso('miembro', PERMISSIONS.REPORTE_CREAR), true);
});

test('un miembro NO puede moderar ni suspender', () => {
  assert.equal(tienePermiso('miembro', PERMISSIONS.MODERACION_ACTUAR), false);
  assert.equal(tienePermiso('miembro', PERMISSIONS.USUARIO_SUSPENDER), false);
  assert.equal(tienePermiso('miembro', PERMISSIONS.AUDITORIA_VER), false);
});

test('el moderador actua sobre la cola pero no administra usuarios', () => {
  assert.equal(tienePermiso('moderador', PERMISSIONS.MODERACION_COLA_VER), true);
  assert.equal(tienePermiso('moderador', PERMISSIONS.MODERACION_ACTUAR), true);
  assert.equal(
    tienePermiso('moderador', PERMISSIONS.USUARIO_ADMINISTRAR),
    false,
    'moderar contenido no es administrar personas',
  );
});

test('el lider de organizacion solo administra la suya', () => {
  assert.equal(tienePermiso('lider_org', PERMISSIONS.COMUNIDAD_ADMINISTRAR_PROPIA), true);
  assert.equal(tienePermiso('lider_org', PERMISSIONS.COMUNIDAD_ADMINISTRAR_CUALQUIERA), false);
});

test('un suspendido no publica ni escribe, pero conserva su perfil para apelar', () => {
  assert.equal(tienePermiso('suspendido', PERMISSIONS.PUBLICACION_CREAR), false);
  assert.equal(tienePermiso('suspendido', PERMISSIONS.COMENTARIO_CREAR), false);
  assert.equal(tienePermiso('suspendido', PERMISSIONS.MENSAJE_ENVIAR), false);
  assert.equal(tienePermiso('suspendido', PERMISSIONS.PERFIL_EDITAR_PROPIO), true);
});

test('el super admin tiene todo', () => {
  assert.equal(tienePermiso('super_admin', PERMISSIONS.UNIVERSIDAD_ADMINISTRAR), true);
  assert.equal(tienePermiso('super_admin', PERMISSIONS.MODERACION_ACTUAR), true);
});

test('el permiso se concede si cualquiera de los roles lo tiene', () => {
  assert.equal(
    algunRolTienePermiso(['miembro', 'moderador'], PERMISSIONS.MODERACION_ACTUAR),
    true,
  );
  assert.equal(
    algunRolTienePermiso(['miembro', 'profesor'], PERMISSIONS.USUARIO_SUSPENDER),
    false,
  );
  assert.equal(algunRolTienePermiso([], PERMISSIONS.PUBLICACION_CREAR), false);
});

test('esRolValido filtra cadenas arbitrarias que lleguen de fuera', () => {
  assert.equal(esRolValido('moderador'), true);
  assert.equal(esRolValido('root'), false);
  assert.equal(esRolValido(''), false);
});
