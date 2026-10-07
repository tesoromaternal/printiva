/**
 * Reglas de precio compartidas por cliente (mostrar) y servidor (cobrar).
 * Módulo puro a propósito: sin nanostores ni localStorage, así lo puede
 * importar el endpoint de SumUp sin arrastrar código de navegador.
 */
export const FREE_SHIPPING_FROM_CENTS = 5000;
export const SHIPPING_CENTS = 495;

export const shippingFor = (subtotalCents: number): number =>
  subtotalCents === 0 || subtotalCents >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING_CENTS;
