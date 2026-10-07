import type { MockupKind, PrintArt } from "./types";

/** Nombres en español de los valores internos (para el panel). */
export const KIND_LABEL: Record<MockupKind, string> = {
  tshirt: "Camiseta",
  hoodie: "Sudadera",
  mug: "Taza",
  cap: "Gorra",
  tote: "Bolsa",
  bottle: "Botella",
  bodysuit: "Body bebé",
  gift: "Caja regalo",
  polo: "Polo",
  cushion: "Cojín",
};

export const ART_LABEL: Record<PrintArt, string> = {
  heart: "Corazón",
  goodvibes: "Good vibes",
  sonrie: "Sonríe",
  aventura: "Aventura",
  familia: "Familia",
  disfruta: "Disfruta",
  sun: "Sol",
  paw: "Huella",
  logo: "Tu logo",
  none: "Ninguno",
};

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
