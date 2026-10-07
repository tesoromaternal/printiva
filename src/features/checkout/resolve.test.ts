import { describe, expect, it } from "vitest";

import type { Product } from "../catalog/types";
import { MAX_CART_LINES, parseSessionRequest, resolveOrder } from "./resolve";
import type { CheckoutLine } from "./types";

const tee: Product = {
  slug: "camiseta-personalizada",
  name: "Camiseta personalizada",
  summary: "",
  description: "",
  categorySlug: "camisetas",
  kind: "tshirt",
  priceCents: 1990,
  colors: [
    { name: "Blanco", hex: "#FFFFFF" },
    { name: "Negro", hex: "#1F2125" },
  ],
  sizes: ["S", "M"],
  occasions: [],
  art: "heart",
  images: [],
  badge: null,
  featured: true,
};

const mug: Product = { ...tee, slug: "taza-personalizada", name: "Taza personalizada", kind: "mug", priceCents: 1290, sizes: [] };

const line = (overrides: Partial<CheckoutLine> = {}): CheckoutLine => ({
  slug: "camiseta-personalizada",
  colorHex: "#1F2125",
  size: "M",
  quantity: 1,
  customization: { image: null, text: "Hola", textFont: "sans", textColor: null, imageScale: 1, imageOffset: 0 },
  ...overrides,
});

const customer = { name: "Ana", email: "ana@example.com", phone: "600000000", address: "Calle 1", zip: "28001", city: "Madrid", province: "Madrid", notes: "" };

describe("resolveOrder — pricing comes only from the catalog", () => {
  it("prices lines from the catalog and adds shipping under the free threshold", () => {
    const order = resolveOrder([line({ quantity: 2 })], [tee]);

    expect(order.subtotalCents).toBe(3980);
    expect(order.shippingCents).toBe(495);
    expect(order.totalCents).toBe(4475);
    expect(order.items[0]?.colorName).toBe("Negro");
  });

  it("gives free shipping from 50 €", () => {
    const order = resolveOrder([line({ quantity: 3 })], [tee]);
    expect(order.shippingCents).toBe(0);
    expect(order.totalCents).toBe(5970);
  });

  it("ignores any price-like field the client might smuggle in", () => {
    const tampered = { ...line(), priceCents: 1 } as CheckoutLine;
    expect(resolveOrder([tampered], [tee]).subtotalCents).toBe(1990);
  });

  it.each([
    ["unknown product", line({ slug: "no-existe" })],
    ["color not offered", line({ colorHex: "#00FF00" })],
    ["size not offered", line({ size: "XXL" })],
    ["missing size on a sized product", line({ size: null })],
    ["size on a product without sizes", line({ slug: "taza-personalizada", size: "M" })],
    ["zero quantity", line({ quantity: 0 })],
    ["fractional quantity", line({ quantity: 1.5 })],
    ["absurd quantity", line({ quantity: 1000 })],
  ])("rejects a line with %s", (_, bad) => {
    const order = resolveOrder([bad], [tee, mug]);
    expect(order.items).toHaveLength(0);
    expect(order.invalidLines).toHaveLength(1);
  });
});

describe("parseSessionRequest — body validation", () => {
  it("accepts a valid body", () => {
    expect(parseSessionRequest({ customer, lines: [line()] })).not.toBeNull();
  });

  it("rejects an empty cart or too many lines", () => {
    expect(parseSessionRequest({ customer, lines: [] })).toBeNull();
    expect(parseSessionRequest({ customer, lines: Array.from({ length: MAX_CART_LINES + 1 }, () => line()) })).toBeNull();
  });

  it("rejects a line with nothing to print (no image, blank text)", () => {
    const blank = line({ customization: { ...line().customization, text: "   " } });
    expect(parseSessionRequest({ customer, lines: [blank] })).toBeNull();
  });

  it("only accepts PNG/JPEG data URLs as print images", () => {
    const svg = line({ customization: { ...line().customization, image: "data:image/svg+xml;base64,PHN2Zz4=" } });
    const remote = line({ customization: { ...line().customization, image: "https://evil.example/x.png" } });
    const png = line({ customization: { ...line().customization, image: "data:image/png;base64,iVBORw0KGgo=" } });

    expect(parseSessionRequest({ customer, lines: [svg] })).toBeNull();
    expect(parseSessionRequest({ customer, lines: [remote] })).toBeNull();
    expect(parseSessionRequest({ customer, lines: [png] })).not.toBeNull();
  });

  it("rejects invalid customer data", () => {
    expect(parseSessionRequest({ customer: { ...customer, email: "no-es-email" }, lines: [line()] })).toBeNull();
    expect(parseSessionRequest({ customer: { ...customer, zip: "123" }, lines: [line()] })).toBeNull();
    expect(parseSessionRequest({ customer: { ...customer, name: "  " }, lines: [line()] })).toBeNull();
  });
});
