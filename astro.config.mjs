import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

// Secretos solo de servidor (nunca llegan al navegador), leídos en runtime con
// getSecret(). Opcionales en el schema para que el sitio estático compile sin
// ellos; client.ts/notify.ts fallan cerrado si faltan al intentar cobrar.
const secret = () => envField.string({ context: "server", access: "secret", optional: true });

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || undefined,
  // Todo se renderiza al pedirlo (lo editado en el admin se ve sin builds) y la
  // CDN de Vercel lo cachea: ver PUBLIC_CACHE en src/middleware.ts.
  output: "server",
  adapter: vercel(),
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  env: {
    schema: {
      SUMUP_API_KEY: secret(),
      SUMUP_MERCHANT_CODE: secret(),
      RESEND_API_KEY: secret(),
      ORDER_NOTIFY_EMAIL_FROM: secret(),
      ORDER_NOTIFY_EMAIL_TO: secret(),
      SITE_URL: secret(),
      ADMIN_USERNAME: secret(),
      // Hash scrypt (pnpm admin:hash), NUNCA la contraseña en texto plano.
      ADMIN_PASSWORD_HASH: secret(),
      // Store PÚBLICO de Vercel Blob (fotos de la tienda y del blog).
      BLOB_READ_WRITE_TOKEN: secret(),
      VERCEL_PROJECT_PRODUCTION_URL: secret(),
    },
  },
});
