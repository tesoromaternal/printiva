const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

/** 1990 → "19,90 €" */
export const formatPrice = (cents: number): string => euro.format(cents / 100);
