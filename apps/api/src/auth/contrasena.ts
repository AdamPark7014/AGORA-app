import { Algorithm, hash, verify } from '@node-rs/argon2';

/**
 * Hash de contraseñas con argon2id.
 *
 * Parámetros de la recomendación OWASP (19 MiB, 2 iteraciones, 1 hilo): un
 * volcado de la base cuesta años de GPU por contraseña, y verificar una en el
 * servidor tarda ~30 ms, que nadie nota. El hash lleva su propia sal y sus
 * parámetros dentro de la cadena, así que subirlos más adelante solo obliga a
 * rehashear al siguiente inicio de sesión.
 *
 * La librería es binaria precompilada (`@node-rs/argon2`): no compila nada en
 * el build de Docker, igual que `sharp`.
 */
const OPCIONES = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const hashContrasena = (contrasena: string): Promise<string> => hash(contrasena, OPCIONES);

/** false también si el hash está dañado: nunca lanza por un dato de la base. */
export const verificarContrasena = async (hashGuardado: string, contrasena: string): Promise<boolean> => {
  try {
    return await verify(hashGuardado, contrasena, OPCIONES);
  } catch {
    return false;
  }
};

/**
 * Hash de una contraseña que nadie tiene. Cuando el correo no existe o la
 * cuenta aún no tiene contraseña, se verifica contra esto para que la
 * petición tarde lo mismo que una real: si respondiera al instante, la
 * duración diría quién tiene cuenta.
 */
let senuelo: Promise<string> | null = null;
export const hashSenuelo = (): Promise<string> => (senuelo ??= hashContrasena('senuelo-agora-udlap'));
