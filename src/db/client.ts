import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

// Astro (Vite) expone el .env en import.meta.env; el seed corre con tsx y lo
// recibe en process.env.
const env = { ...process.env, ...(import.meta.env ?? {}) } as Record<string, string | undefined>;

const url = env["TURSO_DATABASE_URL"]?.trim();
const authToken = env["TURSO_AUTH_TOKEN"]?.trim() || undefined;

// En Vercel/producción NUNCA caer al SQLite local: local.db no se despliega
// (está en .gitignore) y el filesystem de las funciones es de solo lectura.
// Antes fallaba en silencio con un 500 críptico; ahora dice qué falta.
const isDeployed = Boolean(env["VERCEL"]) || import.meta.env?.PROD === true;
if (!url && isDeployed) {
  throw new Error(
    "TURSO_DATABASE_URL no está configurada. Cárgala (y TURSO_AUTH_TOKEN) en Vercel → Settings → Environment Variables y vuelve a desplegar.",
  );
}

// En desarrollo, sin URL se usa SQLite local: mismo dialecto que Turso.
export const db = drizzle(createClient({ url: url || "file:local.db", authToken }), { schema });
