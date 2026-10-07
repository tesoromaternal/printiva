/**
 * POST /api/sumup/webhook — el otro disparador de settleCheckout, además
 * del poll de estado; los dos terminan en la misma función idempotente. El
 * payload es solo `{event_type, id}` (SumUp no firma sus webhooks) y nunca
 * se confía como prueba de pago — settleCheckout vuelve a verificar contra
 * SumUp antes de escribir nada.
 *
 * Devuelve 200 rápido en cualquier resultado no reintentable (pagado, ya
 * pagado, o genuinamente pendiente) y 500 solo cuando settleCheckout reporta
 * un fallo que vale la pena reintentar — SumUp reintenta las respuestas
 * no-2xx con su propio backoff, una segunda red de seguridad sobre el
 * propio poll del cliente.
 */
import type { APIRoute } from "astro";

import { getCheckoutById } from "../../../features/checkout/sumup/checkout";
import { settleCheckout } from "../../../features/checkout/sumup/settle";

export const prerender = false;

interface WebhookBody {
  readonly event_type?: string;
  readonly id?: string;
}

export const POST: APIRoute = async ({ request }) => {
  let body: WebhookBody;
  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!body.id) {
    return new Response(null, { status: 400 });
  }

  try {
    const checkout = await getCheckoutById(body.id);
    const result = await settleCheckout(checkout.checkout_reference);

    if (result.status === "retrying" || result.status === "failed") {
      return new Response(null, { status: 500 });
    }

    return new Response(null, { status: 200 });
  } catch (err) {
    console.error("POST /api/sumup/webhook failed", err);
    return new Response(null, { status: 500 });
  }
};
