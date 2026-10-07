/**
 * Bloque "llamada a la acción" al final de cada post. Lo que no se
 * personaliza cae en estos valores por defecto.
 */
export const CTA_DEFAULTS = {
  title: "¿Te inspiraste?",
  text: "Tú lo imaginas, nosotros lo estampamos.",
  label: "Personaliza ahora",
  url: "/crea-tu-producto",
} as const;

/** Atajos para el selector del panel. */
export const CTA_DESTINATIONS = [
  { label: "Crea tu producto", url: "/crea-tu-producto" },
  { label: "Tienda", url: "/tienda" },
  { label: "Regalos", url: "/regalos" },
  { label: "Empresas (presupuesto)", url: "/empresas#presupuesto" },
  { label: "Contacto", url: "/contacto" },
] as const;

/**
 * Solo rutas internas ("/algo", nunca "//dominio" que el navegador trata como
 * otro sitio) o https://. Bloquea javascript:, data:, http: y similares: este
 * valor termina en un href público.
 */
export const isSafeCtaUrl = (url: string): boolean =>
  (/^\/(?!\/)[^\s]*$/.test(url) || /^https:\/\/[^\s/]+\.[^\s]+$/.test(url)) && url.length <= 300;

export const isExternalUrl = (url: string): boolean => url.startsWith("https://");

export interface CtaFields {
  ctaEnabled: boolean;
  ctaTitle: string | null;
  ctaText: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
}

export interface ResolvedCta {
  title: string;
  text: string;
  label: string;
  url: string;
  external: boolean;
}

/** null = no mostrar el bloque. */
export function resolveCta(post: CtaFields): ResolvedCta | null {
  if (!post.ctaEnabled) return null;
  const url = post.ctaUrl && isSafeCtaUrl(post.ctaUrl) ? post.ctaUrl : CTA_DEFAULTS.url;
  return {
    title: post.ctaTitle?.trim() || CTA_DEFAULTS.title,
    text: post.ctaText?.trim() || CTA_DEFAULTS.text,
    label: post.ctaLabel?.trim() || CTA_DEFAULTS.label,
    url,
    external: isExternalUrl(url),
  };
}
