/**
 * RBAC compartido — unica fuente de verdad para la API, la web y el panel.
 * @agora/rbac
 *
 * Adaptado del patron ya maduro de @herzl/rbac.
 *
 * Nota de diseno: los permisos de moderacion son deliberadamente estrechos.
 * La politica de contenido de Agora (plan 2.1) es de linea roja, no de
 * sensibilidad: criticar profesores, groserias y humor negro NO se tocan. Por
 * eso no existe un permiso generico de "borrar lo que me parezca"; existe
 * MODERACION_ACTUAR sobre una cola con motivo registrado y auditable.
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERADOR: 'moderador',
  LIDER_ORG: 'lider_org',
  PROFESOR: 'profesor',
  MIEMBRO: 'miembro',
  SUSPENDIDO: 'suspendido',
} as const;

export type RoleKey = (typeof ROLES)[keyof typeof ROLES];
export const ALL_ROLES = Object.values(ROLES);

export const ROLE_LABELS: Record<RoleKey, string> = {
  super_admin: 'Super administrador',
  admin: 'Administrador',
  moderador: 'Moderador',
  lider_org: 'Lider de organizacion',
  profesor: 'Profesor',
  miembro: 'Miembro verificado',
  suspendido: 'Suspendido',
};

export const PERMISSIONS = {
  // Contenido propio
  PUBLICACION_CREAR: 'publicacion.crear',
  PUBLICACION_BORRAR_PROPIA: 'publicacion.borrar_propia',
  COMENTARIO_CREAR: 'comentario.crear',
  MENSAJE_ENVIAR: 'mensaje.enviar',

  // Descubrimiento
  DIRECTORIO_VER: 'directorio.ver',
  PERFIL_EDITAR_PROPIO: 'perfil.editar_propio',

  // Reportes — cualquiera puede reportar, pocos pueden resolver
  REPORTE_CREAR: 'reporte.crear',
  MODERACION_COLA_VER: 'moderacion.cola_ver',
  MODERACION_ACTUAR: 'moderacion.actuar',
  MODERACION_APELACION_RESOLVER: 'moderacion.apelacion_resolver',

  // Comunidades
  COMUNIDAD_CREAR: 'comunidad.crear',
  COMUNIDAD_ADMINISTRAR_PROPIA: 'comunidad.administrar_propia',
  COMUNIDAD_ADMINISTRAR_CUALQUIERA: 'comunidad.administrar_cualquiera',

  // Usuarios
  USUARIO_SUSPENDER: 'usuario.suspender',
  USUARIO_ADMINISTRAR: 'usuario.administrar',

  // Operacion
  AUDITORIA_VER: 'auditoria.ver',
  UNIVERSIDAD_ADMINISTRAR: 'universidad.administrar',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/** Lo que puede hacer cualquier alumno verificado. La base de la red. */
const PERMISOS_MIEMBRO: PermissionKey[] = [
  PERMISSIONS.PUBLICACION_CREAR,
  PERMISSIONS.PUBLICACION_BORRAR_PROPIA,
  PERMISSIONS.COMENTARIO_CREAR,
  PERMISSIONS.MENSAJE_ENVIAR,
  PERMISSIONS.DIRECTORIO_VER,
  PERMISSIONS.PERFIL_EDITAR_PROPIO,
  PERMISSIONS.REPORTE_CREAR,
  PERMISSIONS.COMUNIDAD_CREAR,
];

const PERMISOS_MODERADOR: PermissionKey[] = [
  ...PERMISOS_MIEMBRO,
  PERMISSIONS.MODERACION_COLA_VER,
  PERMISSIONS.MODERACION_ACTUAR,
];

const PERMISOS_ADMIN: PermissionKey[] = [
  ...PERMISOS_MODERADOR,
  PERMISSIONS.MODERACION_APELACION_RESOLVER,
  PERMISSIONS.COMUNIDAD_ADMINISTRAR_CUALQUIERA,
  PERMISSIONS.USUARIO_SUSPENDER,
  PERMISSIONS.USUARIO_ADMINISTRAR,
  PERMISSIONS.AUDITORIA_VER,
];

export const ROLE_PERMISSIONS: Record<RoleKey, readonly PermissionKey[]> = {
  // Un usuario suspendido conserva la lectura de su propio perfil para poder
  // apelar, pero no publica ni escribe. Cortarle todo acceso lo deja sin via
  // de defensa, que es justo lo que la politica de apelacion debe evitar.
  suspendido: [PERMISSIONS.PERFIL_EDITAR_PROPIO],
  miembro: PERMISOS_MIEMBRO,
  profesor: PERMISOS_MIEMBRO,
  lider_org: [...PERMISOS_MIEMBRO, PERMISSIONS.COMUNIDAD_ADMINISTRAR_PROPIA],
  moderador: PERMISOS_MODERADOR,
  admin: PERMISOS_ADMIN,
  super_admin: [...ALL_PERMISSIONS],
};

/** Un rol tiene un permiso. Unica via de autorizacion; no duplicar la logica. */
export const tienePermiso = (rol: RoleKey, permiso: PermissionKey): boolean =>
  ROLE_PERMISSIONS[rol].includes(permiso);

/** Alguno de los roles del usuario concede el permiso. */
export const algunRolTienePermiso = (
  roles: readonly RoleKey[],
  permiso: PermissionKey,
): boolean => roles.some((rol) => tienePermiso(rol, permiso));

export const esRolValido = (valor: string): valor is RoleKey =>
  (ALL_ROLES as readonly string[]).includes(valor);

const ROLES_STAFF: readonly RoleKey[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERADOR];

/** Cuenta del equipo: palomita, panel de moderacion, etc. */
export const esStaff = (roles: readonly string[]): boolean =>
  roles.some((rol) => esRolValido(rol) && ROLES_STAFF.includes(rol));
