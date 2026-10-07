import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { MockupKind, PrintArt, ProductColor, ProductImage } from "../features/catalog/types";

export const categories = sqliteTable("categories", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  kind: text("kind").$type<MockupKind>().notNull(),
  tint: text("tint").notNull(),
  // Foto opcional del círculo de categoría; sin ella se dibuja el mockup.
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const occasions = sqliteTable("occasions", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  blurb: text("blurb").notNull(),
  tint: text("tint").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull(),
  categorySlug: text("category_slug")
    .notNull()
    .references(() => categories.slug),
  kind: text("kind").$type<MockupKind>().notNull(),
  // Céntimos: nunca floats para dinero.
  priceCents: integer("price_cents").notNull(),
  colors: text("colors", { mode: "json" }).$type<ProductColor[]>().notNull(),
  sizes: text("sizes", { mode: "json" }).$type<string[]>().notNull(),
  occasions: text("occasions", { mode: "json" }).$type<string[]>().notNull(),
  art: text("art").$type<PrintArt>().notNull(),
  // Fotos reales (Vercel Blob), en orden. Vacío = se muestra el mockup SVG.
  images: text("images", { mode: "json" }).$type<ProductImage[]>().notNull().default(sql`'[]'`),
  badge: text("badge"),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  // Inactivo = oculto en la tienda y no se puede comprar (sin borrar historial).
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  // Lo pone la app al guardar: SQLite no admite ADD COLUMN con default no constante.
  updatedAt: text("updated_at"),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  coverUrl: text("cover_url"),
  coverAlt: text("cover_alt").notNull().default(""),
  // HTML del editor visual, SANEADO en el servidor antes de guardarse.
  contentHtml: text("content_html").notNull().default(""),
  status: text("status").$type<"draft" | "published">().notNull().default("draft"),
  // Bloque "llamada a la acción" al final del post. Textos null = valores por
  // defecto (features/blog/cta.ts), así cambiar el default no exige migrar.
  ctaEnabled: integer("cta_enabled", { mode: "boolean" }).notNull().default(true),
  ctaTitle: text("cta_title"),
  ctaText: text("cta_text"),
  ctaLabel: text("cta_label"),
  ctaUrl: text("cta_url"),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Pedido + estado del checkout de SumUp en una sola fila. Reemplaza al
 * Upstash Redis de menu-la-rueca: la fila "pending" ES la sesión, el lock de
 * settle es `settleLockUntil` (UPDATE atómico) y `status = 'paid'` es el
 * dedupe. Así no sumamos otro servicio: todo vive en Turso.
 */
export const orders = sqliteTable("orders", {
  ref: text("ref").primaryKey(),
  status: text("status").$type<"pending" | "paid">().notNull().default("pending"),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  zip: text("zip").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
  notes: text("notes"),
  subtotalCents: integer("subtotal_cents").notNull(),
  shippingCents: integer("shipping_cents").notNull(),
  // Total autoritativo calculado server-side al crear la sesión.
  amountCents: integer("amount_cents").notNull(),
  sumupCheckoutId: text("sumup_checkout_id"),
  paidAt: text("paid_at"),
  settleLockUntil: integer("settle_lock_until"),
  failureAttempts: integer("failure_attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

/** Líneas con TODO lo necesario para estampar: sin esto el taller cobra y no sabe qué imprimir. */
export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderRef: text("order_ref")
    .notNull()
    .references(() => orders.ref, { onDelete: "cascade" }),
  productSlug: text("product_slug").notNull(),
  productName: text("product_name").notNull(),
  colorName: text("color_name").notNull(),
  colorHex: text("color_hex").notNull(),
  size: text("size"),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  printImage: text("print_image"),
  printText: text("print_text").notNull().default(""),
  printFont: text("print_font").notNull().default("sans"),
  printTextColor: text("print_text_color"),
  imageScale: real("image_scale").notNull().default(1),
  imageOffset: real("image_offset").notNull().default(0),
});

/**
 * Sesiones del panel. `id` es el SHA-256 del token de la cookie, nunca el
 * token: si se filtra la base, no hay cookies válidas que robar. Borrar la
 * fila = sesión revocada de verdad (no como una cookie con hash fijo).
 */
export const adminSessions = sqliteTable("admin_sessions", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

/** Intentos fallidos de login por IP (hasheada) para frenar fuerza bruta. */
export const adminLoginAttempts = sqliteTable("admin_login_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ipHash: text("ip_hash").notNull(),
  attemptedAt: integer("attempted_at").notNull(),
});

// Lista para cuando el formulario de empresas deje de ser mockup.
export const quoteRequests = sqliteTable("quote_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  company: text("company").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  products: text("products", { mode: "json" }).$type<string[]>().notNull(),
  units: integer("units").notNull(),
  message: text("message"),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
