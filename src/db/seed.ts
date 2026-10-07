import { count } from "drizzle-orm";

import { db } from "./client";
import { categories, occasions, products } from "./schema";
import { seedCategories, seedOccasions, seedProducts } from "./seed-data";

/**
 * Carga el catálogo de EJEMPLO. Borra y reemplaza productos, categorías y
 * ocasiones, así que con un admin en uso es destructivo: si ya hay productos
 * se niega salvo `--force`. No toca pedidos, posts ni sesiones.
 */
async function seed() {
  const force = process.argv.includes("--force");
  const [existing] = await db.select({ n: count() }).from(products);

  if ((existing?.n ?? 0) > 0 && !force) {
    console.error(
      `✖ Ya hay ${existing?.n} productos en la base (${process.env["TURSO_DATABASE_URL"] || "file:local.db"}).\n` +
        "  El seed los BORRARÍA junto con lo editado desde el admin.\n" +
        "  Si de verdad quieres reemplazarlos por el catálogo de ejemplo: pnpm db:seed --force",
    );
    process.exit(1);
  }

  await db.delete(products);
  await db.delete(categories);
  await db.delete(occasions);

  await db.insert(categories).values(seedCategories.map((category, index) => ({ ...category, sortOrder: index })));
  await db.insert(occasions).values(seedOccasions.map((occasion, index) => ({ ...occasion, sortOrder: index })));
  await db.insert(products).values(seedProducts.map((product, index) => ({ ...product, sortOrder: index })));

  console.log(`✔ Seed: ${seedCategories.length} categorías, ${seedOccasions.length} ocasiones, ${seedProducts.length} productos`);
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
