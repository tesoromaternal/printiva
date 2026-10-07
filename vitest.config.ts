/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// getViteConfig de Astro (no defineConfig de vitest a secas) para que el
// módulo virtual `astro:env/server` resuelva también dentro de vitest.
export default getViteConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
