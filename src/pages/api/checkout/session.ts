/**
 * POST /api/checkout/session — revalida el carrito server-side, guarda el
 * pedido 'pending' (con el diseño a estampar) en Turso y crea el Checkout de
 * SumUp. El total cobrado SIEMPRE sale de `resolveOrder` contra el catálogo;
 * el body nunca aporta precios.
 */
import type { APIRoute } from "astro";

import { getAllProducts } from "../../../features/catalog/repository";
import { createPendingOrder } from "../../../features/checkout/orders.repository";
import { parseSessionRequest, resolveOrder } from "../../../features/checkout/resolve";
import { buildCheckoutRedirectUrl, createCheckout, newRef } from "../../../features/checkout/sumup/checkout";
import { assertEnv } from "../../../features/checkout/sumup/client";
import { resolveCanonicalOrigin } from "../../../lib/site-origin";

export const prerender = false;

// Por debajo del tope de 4,5 MB de las funciones de Vercel, con margen.
const MAX_BODY_BYTES = 4_000_000;

export const POST: APIRoute = async ({ request, url }) => {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return Response.json({ error: "payload_too_large" }, { status: 413 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const body = parseSessionRequest(raw);
  if (!body) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    // Nunca derivar los callbacks de pago del header Host entrante. Se
    // resuelve antes de persistir nada para que una config de producción
    // inválida falle cerrado, sin dejar pedidos huérfanos.
    const canonicalOrigin = resolveCanonicalOrigin(url);

    const resolved = resolveOrder(body.lines, await getAllProducts());

    // invalid_lines primero: un carrito con TODO desactualizado debe ver
    // "algo cambió, revisa el carrito", no un genérico "carrito vacío".
    if (resolved.invalidLines.length > 0) {
      return Response.json({ error: "invalid_lines", invalidLines: resolved.invalidLines.map((l) => l.slug) }, { status: 422 });
    }
    if (resolved.items.length === 0) {
      return Response.json({ error: "empty_cart" }, { status: 400 });
    }

    // Validado el carrito, y ANTES de persistir: sin credenciales de SumUp no
    // creamos un pedido que nunca podrá cobrarse.
    assertEnv();

    const ref = newRef();
    await createPendingOrder(ref, body.customer, resolved);

    const checkout = await createCheckout({
      ref,
      amountCents: resolved.totalCents,
      webhookUrl: new URL("/api/sumup/webhook", canonicalOrigin).toString(),
      redirectUrl: buildCheckoutRedirectUrl(canonicalOrigin, ref),
    });

    return Response.json({ ref, checkoutId: checkout.id, totalCents: resolved.totalCents }, { status: 200 });
  } catch (err) {
    console.error("POST /api/checkout/session failed", err);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
};
