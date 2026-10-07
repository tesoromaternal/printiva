import { shippingFor } from "../cart/pricing";
import type { Product } from "../catalog/types";
import type { CheckoutLine, Customer, PrintCustomization, ResolvedOrder, ResolvedOrderItem } from "./types";

export const MAX_QUANTITY_PER_LINE = 99;
// Cada línea puede traer una imagen (~250 KB): el body de una función de
// Vercel tope en 4,5 MB, así que acotamos líneas y tamaño de imagen.
export const MAX_CART_LINES = 12;
export const MAX_IMAGE_CHARS = 700_000;
export const MAX_TEXT_LENGTH = 40;

const FONTS = new Set(["sans", "script", "display"]);
const HEX = /^#[0-9a-f]{6}$/i;
const DATA_IMAGE = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

function parseCustomization(value: unknown): PrintCustomization | null {
  if (!isObject(value)) return null;
  const { image, text, textFont, textColor, imageScale, imageOffset } = value;

  if (image !== null && !(typeof image === "string" && image.length <= MAX_IMAGE_CHARS && DATA_IMAGE.test(image))) return null;
  if (typeof text !== "string" || text.length > MAX_TEXT_LENGTH) return null;
  if (typeof textFont !== "string" || !FONTS.has(textFont)) return null;
  if (textColor !== null && !(typeof textColor === "string" && HEX.test(textColor))) return null;
  if (!inRange(imageScale, 0.4, 1.6) || !inRange(imageOffset, -1, 1)) return null;
  // Misma regla que la UI: sin imagen ni texto no hay nada que estampar.
  if (image === null && text.trim().length === 0) return null;

  return { image, text: text.trim(), textFont: textFont as PrintCustomization["textFont"], textColor, imageScale, imageOffset };
}

function parseLine(value: unknown): CheckoutLine | null {
  if (!isObject(value)) return null;
  const { slug, colorHex, size, quantity, customization } = value;
  if (typeof slug !== "string" || typeof colorHex !== "string") return null;
  if (size !== null && typeof size !== "string") return null;
  if (typeof quantity !== "number") return null;
  const parsed = parseCustomization(customization);
  if (!parsed) return null;
  return { slug, colorHex, size, quantity, customization: parsed };
}

const trimmed = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;

function parseCustomer(value: unknown): Customer | null {
  if (!isObject(value)) return null;
  const name = trimmed(value.name, 120);
  const email = trimmed(value.email, 200);
  const phone = trimmed(value.phone, 30);
  const address = trimmed(value.address, 200);
  const zip = trimmed(value.zip, 10);
  const city = trimmed(value.city, 100);
  const province = trimmed(value.province, 100);
  const notes = typeof value.notes === "string" ? value.notes.trim().slice(0, 500) : "";

  if (!name || !email || !phone || !address || !zip || !city || !province) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (!/^\d{5}$/.test(zip)) return null;

  return { name, email, phone, address, zip, city, province, notes };
}

export interface SessionRequest {
  readonly customer: Customer;
  readonly lines: readonly CheckoutLine[];
}

/** Valida el body completo de POST /api/checkout/session. null = 400. */
export function parseSessionRequest(value: unknown): SessionRequest | null {
  if (!isObject(value) || !Array.isArray(value.lines)) return null;
  if (value.lines.length === 0 || value.lines.length > MAX_CART_LINES) return null;

  const customer = parseCustomer(value.customer);
  if (!customer) return null;

  const lines: CheckoutLine[] = [];
  for (const raw of value.lines) {
    const line = parseLine(raw);
    if (!line) return null;
    lines.push(line);
  }
  return { customer, lines };
}

const isValidQuantity = (quantity: number): boolean =>
  Number.isInteger(quantity) && quantity > 0 && quantity <= MAX_QUANTITY_PER_LINE;

/**
 * Convierte líneas (solo referencias) en importes reales contra el catálogo.
 * Nunca confía en un precio del cliente: el ÚNICO lugar donde una línea se
 * vuelve dinero. Lo usa la sesión (cobrar) y settle (re-verificar).
 */
export function resolveOrder(lines: readonly CheckoutLine[], products: readonly Product[]): ResolvedOrder {
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const items: ResolvedOrderItem[] = [];
  const invalidLines: CheckoutLine[] = [];

  for (const line of lines) {
    const product = bySlug.get(line.slug);
    const color = product?.colors.find((c) => c.hex.toLowerCase() === line.colorHex.toLowerCase());
    const sizeOk = product && (product.sizes.length === 0 ? line.size === null : line.size !== null && product.sizes.includes(line.size));

    if (!product || !color || !sizeOk || !isValidQuantity(line.quantity)) {
      invalidLines.push(line);
      continue;
    }

    items.push({
      ...line,
      colorHex: color.hex,
      productName: product.name,
      colorName: color.name,
      unitPriceCents: product.priceCents,
      lineTotalCents: product.priceCents * line.quantity,
    });
  }

  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const shippingCents = shippingFor(subtotalCents);
  return { items, invalidLines, subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents };
}
