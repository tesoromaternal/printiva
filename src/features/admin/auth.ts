/**
 * Sesiones y límite de intentos del panel, sobre Turso.
 */
import { getSecret } from "astro:env/server";
import { and, eq, gt, lt } from "drizzle-orm";

import { db } from "../../db/client";
import { adminLoginAttempts, adminSessions } from "../../db/schema";
import { hashPassword, hashToken, newSessionToken, safeEqual, verifyPassword } from "./crypto";

export const ADMIN_SESSION_COOKIE = "printiva_admin";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_FAILED_ATTEMPTS = 5;
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export interface AdminConfig {
  readonly username: string;
  readonly passwordHash: string;
}

/** null = admin sin configurar (el middleware responde 503, como en puedes-ser-mas). */
export function getAdminConfig(): AdminConfig | null {
  const username = getSecret("ADMIN_USERNAME")?.trim();
  const passwordHash = getSecret("ADMIN_PASSWORD_HASH")?.trim();
  return username && passwordHash ? { username, passwordHash } : null;
}

// Hash de relleno: con usuario incorrecto igual corremos scrypt, así el
// tiempo de respuesta no revela si el usuario existe.
let dummyHash: Promise<string> | null = null;

export async function checkCredentials(config: AdminConfig, username: string, password: string): Promise<boolean> {
  const userOk = safeEqual(username.trim(), config.username);
  const hash = userOk ? config.passwordHash : await (dummyHash ??= hashPassword("printiva-dummy-password"));
  const passOk = await verifyPassword(password, hash);
  return userOk && passOk;
}

export async function createSession(username: string): Promise<{ token: string; expiresAt: Date }> {
  const token = newSessionToken();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await db.insert(adminSessions).values({ id: hashToken(token), username, expiresAt });
  // Limpieza oportunista de sesiones vencidas.
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, Date.now()));
  return { token, expiresAt: new Date(expiresAt) };
}

export async function validateSession(token: string | undefined): Promise<{ username: string } | null> {
  if (!token) return null;
  const [session] = await db
    .select({ username: adminSessions.username })
    .from(adminSessions)
    .where(and(eq(adminSessions.id, hashToken(token)), gt(adminSessions.expiresAt, Date.now())))
    .limit(1);
  return session ?? null;
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await db.delete(adminSessions).where(eq(adminSessions.id, hashToken(token)));
}

/** Minutos que faltan para poder reintentar, o 0 si no está bloqueado. */
export async function lockoutMinutes(ip: string): Promise<number> {
  const since = Date.now() - ATTEMPT_WINDOW_MS;
  const attempts = await db
    .select({ at: adminLoginAttempts.attemptedAt })
    .from(adminLoginAttempts)
    .where(and(eq(adminLoginAttempts.ipHash, hashToken(ip)), gt(adminLoginAttempts.attemptedAt, since)))
    .orderBy(adminLoginAttempts.attemptedAt);

  if (attempts.length < MAX_FAILED_ATTEMPTS) return 0;
  const oldest = attempts[attempts.length - MAX_FAILED_ATTEMPTS]?.at ?? Date.now();
  return Math.max(1, Math.ceil((oldest + ATTEMPT_WINDOW_MS - Date.now()) / 60_000));
}

export async function recordFailedAttempt(ip: string): Promise<void> {
  await db.insert(adminLoginAttempts).values({ ipHash: hashToken(ip), attemptedAt: Date.now() });
  await db.delete(adminLoginAttempts).where(lt(adminLoginAttempts.attemptedAt, Date.now() - ATTEMPT_WINDOW_MS));
}

export async function clearFailedAttempts(ip: string): Promise<void> {
  await db.delete(adminLoginAttempts).where(eq(adminLoginAttempts.ipHash, hashToken(ip)));
}

export const sessionCookieOptions = (expires: Date) => ({
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "lax" as const,
  // La cookie solo viaja a /admin: la tienda pública nunca la recibe.
  path: "/admin",
  expires,
});
