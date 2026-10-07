import { defineConfig } from "drizzle-kit";

// Sin TURSO_DATABASE_URL usamos un SQLite local (file:local.db): mismo motor
// libsql, así el mockup corre sin crear la base en la nube todavía.
export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env["TURSO_DATABASE_URL"] || "file:local.db",
    authToken: process.env["TURSO_AUTH_TOKEN"] || undefined,
  },
});
