/**
 * Primitivas criptográficas del login. Puras (solo node:crypto), sin DB ni
 * Astro, para poder testearlas aisladas.
 *
 * Por qué no el sha256(password) de puedes-ser-mas: un hash rápido y sin sal
 * se rompe por fuerza bruta en minutos, y usado como cookie revela la
 * contraseña y nunca se puede revocar. scrypt es lento a propósito (costo de
 * memoria) y lleva sal aleatoria.
 */
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, options, (error, key) => (error ? reject(error) : resolve(key))),
  );

const N = 16384; // 2^14 → ~16 MB por intento: caro para un atacante, ok para un login.
const R = 8;
const P = 1;
const KEYLEN = 64;

/**
 * Formato: scrypt:N:r:p:salt(base64):hash(base64). Autodescriptivo, para poder
 * subir el costo sin romper hashes viejos. Separador ":" y NO "$": Vite expande
 * `$VAR` dentro de los .env (dotenv-expand) y destrozaría el hash en silencio.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join(":");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, hashB64] = stored.split(":");
  if (algo !== "scrypt" || !n || !r || !p || !saltB64 || !hashB64) return false;

  const expected = Buffer.from(hashB64, "base64");
  if (expected.length === 0) return false;
  try {
    const key = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

/** Comparación de strings en tiempo constante (hashea ambos para igualar longitudes). */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

/** Token de sesión: 32 bytes aleatorios. Va en la cookie; a la DB solo su hash. */
export const newSessionToken = (): string => randomBytes(32).toString("base64url");

export const hashToken = (value: string): string => createHash("sha256").update(value).digest("hex");
