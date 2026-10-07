import { assertEnv, sumup } from "./client";
import type { SumUpCheckout } from "./types";

/** ref = 22 caracteres base64url de 16 bytes aleatorios. Es el `checkout_reference` de SumUp. */
export function newRef(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/**
 * centavos (nuestro dominio, entero) -> "amount" de SumUp (unidades mayores,
 * ej. 1990 -> 19.9). La API de SumUp toma/devuelve unidades mayores
 * decimales — este es el ÚNICO lugar donde se cruza esa frontera.
 */
export function centsToMajorAmount(cents: number): number {
  return cents / 100;
}

/** Inversa de centsToMajorAmount — redondea para evitar drift de punto flotante. */
export function majorAmountToCents(amount: number): number {
  return Math.round(amount * 100);
}

interface CreateCheckoutInput {
  readonly ref: string;
  readonly amountCents: number;
  readonly webhookUrl: string;
  readonly redirectUrl: string;
}

/**
 * Construye el destino fijo del navegador que usa SumUp tras completar un
 * método de pago alternativo. Solo la ref (opaca) es variable; el caller no
 * puede elegir un destino, así que esto nunca puede volverse un open
 * redirect. Reusa la misma página de checkout: al volver con `?ref=`,
 * CheckoutView detecta el parámetro y muestra el estado de confirmación en
 * vez del resumen del carrito.
 */
export function buildCheckoutRedirectUrl(origin: string, ref: string): string {
  const redirectUrl = new URL("/checkout", origin);
  redirectUrl.searchParams.set("ref", ref);
  return redirectUrl.toString();
}

/**
 * Crea un Checkout de SumUp. `redirect_url` es obligatorio para Apple Pay y
 * Google Pay a través del widget (no usados todavía, pero se deja
 * preparado). `return_url` es el webhook servidor-a-servidor, separado del
 * destino del navegador.
 */
export async function createCheckout(
  input: CreateCheckoutInput,
): Promise<SumUpCheckout> {
  const { merchantCode } = assertEnv();

  return sumup<SumUpCheckout>("/v0.1/checkouts", {
    method: "POST",
    body: JSON.stringify({
      checkout_reference: input.ref,
      amount: centsToMajorAmount(input.amountCents),
      currency: "EUR",
      merchant_code: merchantCode,
      return_url: input.webhookUrl,
      redirect_url: input.redirectUrl,
    }),
  });
}

/** GET /v0.1/checkouts?checkout_reference=... — filtrado a nuestra ref. */
export async function getCheckoutByRef(
  ref: string,
): Promise<SumUpCheckout | null> {
  const results = await sumup<SumUpCheckout[]>(
    `/v0.1/checkouts?checkout_reference=${encodeURIComponent(ref)}`,
  );
  return results[0] ?? null;
}

/**
 * GET /v0.1/checkouts/{checkout_id} — por el id PROPIO de SumUp, no por
 * nuestra ref. Necesario porque el payload del webhook (`{event_type, id}`)
 * solo trae el id de SumUp; la respuesta incluye `checkout_reference`, que
 * el handler del webhook le pasa a settleCheckout(ref).
 */
export async function getCheckoutById(id: string): Promise<SumUpCheckout> {
  return sumup<SumUpCheckout>(`/v0.1/checkouts/${encodeURIComponent(id)}`);
}
