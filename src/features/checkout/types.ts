import type { PrintFont } from "../catalog/components/ProductMockup";

/**
 * Lo que el navegador manda al crear la sesión: SOLO referencias + la
 * personalización. Nunca precios ni nombres — eso sale del catálogo en Turso.
 */
export interface CheckoutLine {
  readonly slug: string;
  readonly colorHex: string;
  readonly size: string | null;
  readonly quantity: number;
  readonly customization: PrintCustomization;
}

export interface PrintCustomization {
  readonly image: string | null;
  readonly text: string;
  readonly textFont: PrintFont;
  readonly textColor: string | null;
  readonly imageScale: number;
  readonly imageOffset: number;
}

export interface Customer {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly address: string;
  readonly zip: string;
  readonly city: string;
  readonly province: string;
  readonly notes: string;
}

export interface ResolvedOrderItem extends CheckoutLine {
  readonly productName: string;
  readonly colorName: string;
  readonly unitPriceCents: number;
  readonly lineTotalCents: number;
}

export interface ResolvedOrder {
  readonly items: readonly ResolvedOrderItem[];
  readonly invalidLines: readonly CheckoutLine[];
  readonly subtotalCents: number;
  readonly shippingCents: number;
  readonly totalCents: number;
}

export interface PaidOrder {
  readonly reference: string;
  readonly sumupCheckoutId: string;
  readonly customer: Customer;
  readonly items: readonly ResolvedOrderItem[];
  readonly subtotalCents: number;
  readonly shippingCents: number;
  readonly totalCents: number;
  readonly paidAt: string;
}
