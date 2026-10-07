import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { categories, occasions, products } from "../../db/schema";
import type { Category, Occasion, Product } from "./types";

/**
 * Lectura PÚBLICA del catálogo: solo productos activos. Las páginas no
 * conocen Drizzle ni Turso. La escritura vive en features/admin.
 */

export const productColumns = {
  slug: products.slug,
  name: products.name,
  summary: products.summary,
  description: products.description,
  categorySlug: products.categorySlug,
  kind: products.kind,
  priceCents: products.priceCents,
  colors: products.colors,
  sizes: products.sizes,
  occasions: products.occasions,
  art: products.art,
  images: products.images,
  badge: products.badge,
  featured: products.featured,
};

export const categoryColumns = {
  slug: categories.slug,
  name: categories.name,
  description: categories.description,
  kind: categories.kind,
  tint: categories.tint,
  imageUrl: categories.imageUrl,
};

const occasionColumns = {
  slug: occasions.slug,
  name: occasions.name,
  emoji: occasions.emoji,
  blurb: occasions.blurb,
  tint: occasions.tint,
};

const isActive = eq(products.active, true);
const catalogOrder = [asc(products.sortOrder), asc(products.id)];

export const getCategories = (): Promise<Category[]> =>
  db.select(categoryColumns).from(categories).orderBy(asc(categories.sortOrder));

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const [category] = await db.select(categoryColumns).from(categories).where(eq(categories.slug, slug)).limit(1);
  return category ?? null;
}

export const getOccasions = (): Promise<Occasion[]> =>
  db.select(occasionColumns).from(occasions).orderBy(asc(occasions.sortOrder));

export async function getOccasionBySlug(slug: string): Promise<Occasion | null> {
  const [occasion] = await db.select(occasionColumns).from(occasions).where(eq(occasions.slug, slug)).limit(1);
  return occasion ?? null;
}

/** Catálogo comprable. Lo usa también el checkout: un producto inactivo no se puede cobrar. */
export const getAllProducts = (): Promise<Product[]> =>
  db.select(productColumns).from(products).where(isActive).orderBy(desc(products.featured), ...catalogOrder);

export const getFeaturedProducts = (): Promise<Product[]> =>
  db
    .select(productColumns)
    .from(products)
    .where(and(isActive, eq(products.featured, true)))
    .orderBy(...catalogOrder);

export const getProductsByCategory = (categorySlug: string): Promise<Product[]> =>
  db
    .select(productColumns)
    .from(products)
    .where(and(isActive, eq(products.categorySlug, categorySlug)))
    .orderBy(...catalogOrder);

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const [product] = await db
    .select(productColumns)
    .from(products)
    .where(and(isActive, eq(products.slug, slug)))
    .limit(1);
  return product ?? null;
}

// JSON en SQLite: filtrar en memoria es más simple que json_each y el
// catálogo es chico. Si crece, pasar a tabla puente product_occasions.
export const getProductsByOccasion = async (occasionSlug: string): Promise<Product[]> =>
  (await getAllProducts()).filter((product) => product.occasions.includes(occasionSlug));
