/**
 * El HTML del editor se SANEA en el servidor antes de guardarlo. Aunque solo
 * escribe el admin, si alguien robara una sesión podría meter <script> y
 * atacar a TODOS los visitantes del blog (XSS almacenado). Lista blanca:
 * solo lo que el editor produce, nada más.
 */
import sanitizeHtml from "sanitize-html";

export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "blockquote", "code", "pre", "hr", "br", "img"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    transformTags: {
      // Enlaces externos: nueva pestaña y sin acceso a window.opener.
      a: (tagName, attribs) => {
        const href = attribs["href"] ?? "";
        const safe: Record<string, string> = { href };
        if (/^https?:\/\//i.test(href)) {
          safe["target"] = "_blank";
          safe["rel"] = "noopener noreferrer";
        }
        return { tagName, attribs: safe };
      },
    },
    // Solo imágenes https (Vercel Blob) o /uploads/ (desarrollo local). Las
    // rutas relativas no tienen esquema y allowedSchemes no las filtra.
    exclusiveFilter: (frame) => frame.tag === "img" && !/^(https:\/\/|\/uploads\/)/.test(frame.attribs["src"] ?? ""),
  });
}

/** Texto plano para extractos y tiempo de lectura. */
export const htmlToText = (html: string): string =>
  // Espacio en cada fin de bloque: si no, "<h2>Hola</h2><p>mundo" → "Holamundo".
  sanitizeHtml(html.replace(/<\/(p|h[1-6]|li|blockquote|pre)>|<br\s*\/?>/gi, " "), { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();

export const readingMinutes = (html: string): number => Math.max(1, Math.round(htmlToText(html).split(" ").length / 200));
