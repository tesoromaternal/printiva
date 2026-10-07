import { describe, expect, it } from "vitest";

import { slugify } from "../../lib/slug";
import { htmlToText, readingMinutes, sanitizePostHtml } from "./sanitize";

describe("sanitizePostHtml — stored XSS guard", () => {
  it.each([
    ["<script>", '<p>hola</p><script>alert(1)</script>', "<p>hola</p>"],
    ["inline handlers", '<p onclick="alert(1)">hola</p>', "<p>hola</p>"],
    ["javascript: links", '<a href="javascript:alert(1)">x</a>', "<a>x</a>"],
    ["iframes", '<iframe src="https://evil.example"></iframe><p>ok</p>', "<p>ok</p>"],
    ["styles", '<p style="background:url(x)">hola</p>', "<p>hola</p>"],
    ["data: images", '<img src="data:image/png;base64,AAAA" />', ""],
    ["arbitrary relative images + handlers", '<img src=x onerror=alert(2)><p>ok</p>', "<p>ok</p>"],
  ])("strips %s", (_, dirty, clean) => {
    expect(sanitizePostHtml(dirty)).toBe(clean);
  });

  it("keeps everything the editor produces", () => {
    const html = "<h2>Título</h2><p><strong>a</strong> <em>b</em> <u>c</u> <s>d</s></p><ul><li>x</li></ul><blockquote><p>cita</p></blockquote><hr />";
    expect(sanitizePostHtml(html)).toBe(html.replace("<hr />", "<hr />"));
  });

  it("keeps https and dev-relative images", () => {
    expect(sanitizePostHtml('<img src="https://x.public.blob.vercel-storage.com/a.webp" alt="a" />')).toContain('src="https://x.public.blob.vercel-storage.com/a.webp"');
    expect(sanitizePostHtml('<img src="/uploads/blog/a.webp" alt="a" />')).toContain('src="/uploads/blog/a.webp"');
  });

  it("forces safe attributes on external links", () => {
    expect(sanitizePostHtml('<a href="https://example.com" target="_self">x</a>')).toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer">x</a>');
    expect(sanitizePostHtml('<a href="/tienda">x</a>')).toBe('<a href="/tienda">x</a>');
  });
});

describe("text helpers", () => {
  it("extracts plain text and estimates reading time", () => {
    expect(htmlToText("<h2>Hola</h2><p>mundo  <strong>bonito</strong></p>")).toBe("Hola mundo bonito");
    expect(readingMinutes(`<p>${"palabra ".repeat(600)}</p>`)).toBe(3);
    expect(readingMinutes("<p>corto</p>")).toBe(1);
  });
});

describe("slugify", () => {
  it.each([
    ["Camiseta Niño & Niña", "camiseta-nino-nina"],
    ["  ¡Regalos para Mamá!  ", "regalos-para-mama"],
    ["Taza 330 ml", "taza-330-ml"],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});
