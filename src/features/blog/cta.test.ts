import { describe, expect, it } from "vitest";

import { postInput } from "../admin/schemas";
import { CTA_DEFAULTS, isSafeCtaUrl, resolveCta, type CtaFields } from "./cta";

const fields = (overrides: Partial<CtaFields> = {}): CtaFields => ({
  ctaEnabled: true,
  ctaTitle: null,
  ctaText: null,
  ctaLabel: null,
  ctaUrl: null,
  ...overrides,
});

describe("isSafeCtaUrl — the URL ends up in a public href", () => {
  it.each(["/tienda", "/empresas#presupuesto", "/regalos/mama", "/crea-tu-producto?producto=taza-personalizada", "https://instagram.com/printiva"])("accepts %s", (url) => {
    expect(isSafeCtaUrl(url)).toBe(true);
  });

  it.each([
    ["javascript:", "javascript:alert(1)"],
    ["protocol-relative (other site)", "//evil.example/phish"],
    ["plain http", "http://example.com"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["relative without slash", "tienda"],
    ["whitespace tricks", "/tienda javascript:alert(1)"],
    ["https without host", "https://"],
  ])("rejects %s", (_, url) => {
    expect(isSafeCtaUrl(url)).toBe(false);
  });
});

describe("resolveCta", () => {
  it("hides the block when disabled", () => {
    expect(resolveCta(fields({ ctaEnabled: false, ctaTitle: "x" }))).toBeNull();
  });

  it("falls back to defaults for empty fields", () => {
    expect(resolveCta(fields({ ctaTitle: "  " }))).toEqual({ ...CTA_DEFAULTS, external: false });
  });

  it("uses custom values and flags external links", () => {
    expect(resolveCta(fields({ ctaTitle: "¿Tienes empresa?", ctaLabel: "Pide presupuesto", ctaUrl: "https://wa.me/34600000000" }))).toMatchObject({
      title: "¿Tienes empresa?",
      label: "Pide presupuesto",
      text: CTA_DEFAULTS.text,
      url: "https://wa.me/34600000000",
      external: true,
    });
  });

  it("never renders an unsafe stored URL, even if it bypassed validation", () => {
    expect(resolveCta(fields({ ctaUrl: "javascript:alert(1)" }))?.url).toBe(CTA_DEFAULTS.url);
  });
});

describe("postInput — CTA fields", () => {
  const base = { title: "Post", slug: "post", excerpt: "", coverUrl: null, coverAlt: "", contentHtml: "<p>x</p>", status: "draft" as const, ctaEnabled: true };

  it("stores empty texts as null so defaults apply", () => {
    const parsed = postInput.parse({ ...base, ctaTitle: "", ctaText: "   ", ctaLabel: null, ctaUrl: "" });
    expect(parsed).toMatchObject({ ctaTitle: null, ctaText: null, ctaLabel: null, ctaUrl: null });
  });

  it("rejects an unsafe destination", () => {
    const result = postInput.safeParse({ ...base, ctaTitle: null, ctaText: null, ctaLabel: null, ctaUrl: "javascript:alert(1)" });
    expect(result.success).toBe(false);
  });
});
