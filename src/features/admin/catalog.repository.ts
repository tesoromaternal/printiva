/**
 * Escritura del catálogo desde el panel. A diferencia del repositorio
 * público, ve también los productos inactivos.
 */
import { asc, eq, ne, and, max } from "drizzle-orm";

import { db } from "../../db/client";
import { categories, products } from "../../db/schema";
import type { CategoryInput, ProductInput } from "./schemas";
import { deleteImages } from "./storage";

export type AdminProduct = typeof products.$inferSelect;

export class SlugTakenError extends Error {}

export const listProducts = (): Promise<AdminProduct[]> =>
  db.select().from(products).orderBy(asc(products.sortOrder), asc(products.id));

export async function getProduct(id: number): Promise<AdminProduct | null> {
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return product ?? null;
}

async function assertSlugFree(slug: string, exceptId?: number): Promise<void> {
  const [clash] = await db
    .select({ id: products.id })
    .from(products)
    .where(exceptId ? and(eq(products.slug, slug), ne(products.id, exceptId)) : eq(products.slug, slug))
    .limit(1);
  if (clash) throw new SlugTakenError(slug);
}

const now = () => new Date().toISOString();

export async function createProduct(input: ProductInput): Promise<number> {
  await assertSlugFree(input.slug);
  const [last] = await db.select({ n: max(products.sortOrder) }).from(products);
  const [created] = await db
    .insert(products)
    .values({ ...input, kind: input.kind as AdminProduct["kind"], art: input.art as AdminProduct["art"], sortOrder: (last?.n ?? 0) + 1, updatedAt: now() })
    .returning({ id: products.id });
  if (!created) throw new Error("No se pudo crear el producto");
  return created.id;
}

export async function updateProduct(id: number, input: ProductInput): Promise<void> {
  const current = await getProduct(id);
  if (!current) throw new Error("Producto no encontrado");
  await assertSlugFree(input.slug, id);

  await db
    .update(products)
    .set({ ...input, kind: input.kind as AdminProduct["kind"], art: input.art as AdminProduct["art"], updatedAt: now() })
    .where(eq(products.id, id));

  // Fotos quitadas en el formulario: se borran de Blob DESPUÉS de guardar,
  // así un fallo al guardar nunca deja el producto apuntando a fotos borradas.
  const kept = new Set(input.images.map((image) => image.url));
  await deleteImages(current.images.map((image) => image.url).filter((url) => !kept.has(url)));
}

export async function deleteProduct(id: number): Promise<void> {
  const current = await getProduct(id);
  if (!current) return;
  await db.delete(products).where(eq(products.id, id));
  await deleteImages(current.images.map((image) => image.url));
}

export async function updateCategory(slug: string, input: CategoryInput): Promise<void> {
  const [current] = await db.select({ imageUrl: categories.imageUrl }).from(categories).where(eq(categories.slug, slug)).limit(1);
  if (!current) throw new Error("Categoría no encontrada");
  await db
    .update(categories)
    .set({ ...input, kind: input.kind as AdminProduct["kind"] })
    .where(eq(categories.slug, slug));
  if (current.imageUrl && current.imageUrl !== input.imageUrl) await deleteImages([current.imageUrl]);
}
