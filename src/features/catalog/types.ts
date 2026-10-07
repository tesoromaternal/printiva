/** Silueta SVG que dibuja el mockup del producto. */
export type MockupKind =
  | "tshirt"
  | "hoodie"
  | "mug"
  | "cap"
  | "tote"
  | "bottle"
  | "bodysuit"
  | "gift"
  | "polo"
  | "cushion";

/** Diseño de ejemplo estampado en el mockup cuando el cliente aún no subió nada. */
export type PrintArt =
  | "heart"
  | "goodvibes"
  | "sonrie"
  | "aventura"
  | "familia"
  | "disfruta"
  | "sun"
  | "paw"
  | "logo"
  | "none";

export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductImage {
  url: string;
  alt: string;
}

export interface Category {
  slug: string;
  name: string;
  description: string;
  kind: MockupKind;
  tint: string;
  imageUrl: string | null;
}

export interface Occasion {
  slug: string;
  name: string;
  emoji: string;
  blurb: string;
  tint: string;
}

export interface Product {
  slug: string;
  name: string;
  summary: string;
  description: string;
  categorySlug: string;
  kind: MockupKind;
  priceCents: number;
  colors: ProductColor[];
  sizes: string[];
  occasions: string[];
  art: PrintArt;
  images: ProductImage[];
  badge: string | null;
  featured: boolean;
}

export const MOCKUP_KINDS: readonly MockupKind[] = ["tshirt", "hoodie", "mug", "cap", "tote", "bottle", "bodysuit", "gift", "polo", "cushion"];
export const PRINT_ARTS: readonly PrintArt[] = ["heart", "goodvibes", "sonrie", "aventura", "familia", "disfruta", "sun", "paw", "logo", "none"];
