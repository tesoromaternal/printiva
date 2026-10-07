/**
 * Validación de todo lo que entra por el panel. Se usa en el servidor (la
 * única que cuenta) y los formularios la reutilizan para avisar antes.
 */
import { z } from "astro/zod";

import { SLUG_PATTERN } from "../../lib/slug";
import { isSafeCtaUrl } from "../blog/cta";
import { MOCKUP_KINDS, PRINT_ARTS } from "../catalog/types";

const slug = z.string().trim().min(2).max(80).regex(SLUG_PATTERN, "Solo minúsculas, números y guiones");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color hexadecimal #RRGGBB");
// Fotos: URL https (Vercel Blob) o /uploads/ (solo en desarrollo local).
const imageUrl = z.string().max(500).refine((url) => url.startsWith("https://") || url.startsWith("/uploads/"), "URL de imagen no válida");

export const productInput = z.object({
  name: z.string().trim().min(2).max(120),
  slug,
  summary: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000),
  categorySlug: slug,
  kind: z.enum(MOCKUP_KINDS as [string, ...string[]]),
  art: z.enum(PRINT_ARTS as [string, ...string[]]),
  priceCents: z.number().int().min(0).max(1_000_000),
  colors: z.array(z.object({ name: z.string().trim().min(1).max(40), hex })).min(1, "Al menos un color").max(20),
  sizes: z.array(z.string().trim().min(1).max(20)).max(20),
  occasions: z.array(slug).max(20),
  images: z.array(z.object({ url: imageUrl, alt: z.string().trim().max(200) })).max(12),
  badge: z.string().trim().max(30).nullable(),
  featured: z.boolean(),
  active: z.boolean(),
});
export type ProductInput = z.infer<typeof productInput>;

export const categoryInput = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300),
  kind: z.enum(MOCKUP_KINDS as [string, ...string[]]),
  tint: hex,
  imageUrl: imageUrl.nullable(),
});
export type CategoryInput = z.infer<typeof categoryInput>;

/** Texto opcional: "" o solo espacios se guarda como null (= usar el default). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value ? value : null));

export const postInput = z.object({
  title: z.string().trim().min(2).max(160),
  slug,
  excerpt: z.string().trim().max(300),
  coverUrl: imageUrl.nullable(),
  coverAlt: z.string().trim().max(200),
  contentHtml: z.string().max(200_000),
  status: z.enum(["draft", "published"]),
  ctaEnabled: z.boolean(),
  // Vacío = valor por defecto (features/blog/cta.ts).
  ctaTitle: optionalText(80),
  ctaText: optionalText(200),
  ctaLabel: optionalText(40),
  ctaUrl: optionalText(300).refine((url) => url === null || isSafeCtaUrl(url), "Usa una ruta interna (/tienda) o una URL https://"),
});
export type PostInput = z.infer<typeof postInput>;

/** Errores de zod → { campo: mensaje } para mostrar junto a cada input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}
