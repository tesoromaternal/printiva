/**
 * GET /api/checkout/status?ref= — llama a settleCheckout directamente, igual
 * que el webhook, así un poll del cliente puede completar un pago que el
 * webhook se haya perdido. Sin body, sin mutar nada que el caller aporte —
 * el único input es `ref`.
 */
import type { APIRoute } from "astro";

import { settleCheckout } from "../../../features/checkout/sumup/settle";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const ref = url.searchParams.get("ref");
  if (!ref) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const result = await settleCheckout(ref);
    return Response.json(result, { status: 200 });
  } catch (err) {
    // Un fallo al llegar siquiera a Redis degrada a 'pending' para que el
    // poll del cliente simplemente reintente, en vez de recibir un 500 sin manejar.
    console.error("GET /api/checkout/status failed", err);
    return Response.json({ status: "pending" }, { status: 503 });
  }
};
