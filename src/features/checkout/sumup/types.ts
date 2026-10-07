/**
 * Tipos del dominio de SumUp. `SumUpCheckout`/`SumUpTransaction` reflejan el
 * recurso REST Checkout (developer.sumup.com/api/checkouts) — los montos son
 * unidades MAYORES (ej. 19.9), nunca céntimos.
 */
export type SumUpCheckoutStatus = "PENDING" | "FAILED" | "PAID" | "EXPIRED";
export type SumUpTransactionStatus = "SUCCESSFUL" | "CANCELLED" | "FAILED" | "PENDING" | "REFUNDED";

export interface SumUpTransaction {
  readonly id: string;
  readonly transaction_code: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: SumUpTransactionStatus;
}

export interface SumUpCheckout {
  readonly id: string;
  readonly checkout_reference: string;
  readonly amount: number;
  readonly currency: string;
  readonly merchant_code: string;
  readonly status: SumUpCheckoutStatus;
  readonly date: string;
  readonly transactions: readonly SumUpTransaction[];
}

/** Resultado de settleCheckout(ref) — devuelto tanto por el webhook como por el poll de estado. */
export type SettleResult =
  | { readonly status: "pending" }
  | { readonly status: "paid"; readonly reference: string }
  | { readonly status: "retrying"; readonly attempt: number }
  | { readonly status: "failed"; readonly ref: string };
