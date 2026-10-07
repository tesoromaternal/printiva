import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

// Astro (Vite) expone el .env en import.meta.env; el seed corre con tsx y lo
// recibe en process.env. Sin URL cae a SQLite local: mismo dialecto que Turso.
const env = { ...process.env, ...(import.meta.env ?? {}) } as Record<
  string,
  string | undefined
>;

const url = env["TURSO_DATABASE_URL"] || "file:local.db";
const authToken = env["TURSO_AUTH_TOKEN"] || undefined;

export const db = drizzle(createClient({ url, authToken }), { schema });
