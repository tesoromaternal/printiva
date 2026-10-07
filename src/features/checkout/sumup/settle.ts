/**
 * settleCheckout(ref) — el ÚNICO escritor del pedido pagado. Tanto el webhook
 * como el poll de estado llaman a ESTA función, idempotente; ninguno escribe
 * directamente. Portado de menu-la-rueca: mismo algoritmo, otros ports
 * (Turso en vez de Upstash, catálogo de la DB en vez del Sheet).
 *
 * "Pull-based": siempre vuelve a consultar a SumUp server-side en vez de
 * confiar en el body del webhook — SumUp no firma sus webhooks
 * (developer.sumup.com/online-payments/webhooks/), el payload es solo
 * `{event_type, id}`.
 */
import { getAllProducts } from "../../catalog/repository";
import type { Product } from "../../catalog/types";
import { notifyOpsAlert, notifyOrderPaid } from "../notify";
import { acquireLock, getStoredOrder, markPaid, recordFailure, releaseLock, type StoredOrder } from "../orders.repository";
import { resolveOrder } from "../resolve";
import type { PaidOrder } from "../types";
import { getCheckoutByRef, majorAmountToCents } from "./checkout";
import type { SettleResult } from "./types";

// Mismo tope que el poll del cliente, para que 'failed' llegue a la vez por ambos caminos.
const MAX_ATTEMPTS_BEFORE_FAILED = 5;

export interface SettlePorts {
  readonly acquireLock: (ref: string) => Promise<boolean>;
  readonly releaseLock: (ref: string) => Promise<void>;
  readonly getStoredOrder: (ref: string) => Promise<StoredOrder | null>;
  readonly recordFailure: (ref: string, error: string) => Promise<{ readonly attempt: number }>;
  readonly getCheckoutByRef: (ref: string) => ReturnType<typeof getCheckoutByRef>;
  readonly getProducts: () => Promise<readonly Product[]>;
  readonly markPaid: (ref: string, sumupCheckoutId: string, paidAt: string) => Promise<void>;
  readonly notifyOrderPaid: (order: PaidOrder) => Promise<void>;
  readonly notifyOpsAlert: (payload: { readonly ref: string; readonly error: string; readonly attempt?: number }) => Promise<void>;
}

const defaultPorts: SettlePorts = {
  acquireLock,
  releaseLock,
  getStoredOrder,
  recordFailure,
  getCheckoutByRef,
  getProducts: getAllProducts,
  markPaid,
  notifyOrderPaid,
  notifyOpsAlert,
};

async function handleFailure(ports: SettlePorts, ref: string, error: string): Promise<SettleResult> {
  console.error(`settleCheckout failed — ref ${ref}: ${error}`);
  const record = await ports.recordFailure(ref, error);
  await ports.notifyOpsAlert({ ref, error, attempt: record.attempt });
  return record.attempt >= MAX_ATTEMPTS_BEFORE_FAILED ? { status: "failed", ref } : { status: "retrying", attempt: record.attempt };
}

export async function settleCheckout(ref: string, ports: SettlePorts = defaultPorts): Promise<SettleResult> {
  // Paso 1 — lock de concurrencia. ¿Otro settle en curso lo tiene?
  const locked = await ports.acquireLock(ref);
  if (!locked) {
    return { status: "pending" };
  }

  try {
    // Paso 2 — SumUp es la fuente de verdad del pago (nunca el body del webhook).
    const checkout = await ports.getCheckoutByRef(ref);
    if (!checkout || checkout.status !== "PAID") {
      return { status: "pending" };
    }
    const sumupAmountCents = majorAmountToCents(checkout.amount);

    // Paso 3 — relectura del pedido; si ya está pagado, dedupe sin escribir nada.
    const stored = await ports.getStoredOrder(ref);
    if (!stored) {
      return await handleFailure(ports, ref, "No order found for ref — cannot settle");
    }
    if (stored.status === "paid") {
      return { status: "paid", reference: ref };
    }

    // Paso 4 — se vuelve a resolver contra el catálogo VIGENTE, para detectar
    // un precio que haya cambiado mientras el pago estaba en curso.
    const resolved = resolveOrder(stored.lines, await ports.getProducts());
    if (resolved.items.length === 0 || resolved.invalidLines.length > 0) {
      return await handleFailure(ports, ref, "Order lines no longer resolve against the catalog");
    }

    // Paso 5 — guardia de triple igualdad: lo cobrado al crear la sesión, lo
    // que dice el catálogo AHORA y lo que SumUp realmente cobró.
    if (stored.amountCents !== resolved.totalCents || resolved.totalCents !== sumupAmountCents) {
      return await handleFailure(
        ports,
        ref,
        `Total mismatch: session=${stored.amountCents} resolved=${resolved.totalCents} sumup=${sumupAmountCents}`,
      );
    }

    // Paso 6 — escribe, después notifica. La marca de pagado queda grabada
    // antes de que el email pueda fallar: un settle repetido nunca reenvía.
    const paidAt = new Date().toISOString();
    await ports.markPaid(ref, checkout.id, paidAt);
    await ports.notifyOrderPaid({
      reference: ref,
      sumupCheckoutId: checkout.id,
      customer: stored.customer,
      items: resolved.items,
      subtotalCents: resolved.subtotalCents,
      shippingCents: resolved.shippingCents,
      totalCents: resolved.totalCents,
      paidAt,
    });
    return { status: "paid", reference: ref };
  } catch (err) {
    // Paso 7 — registro de fallo + alerta ante cualquier error, incluso de red/API.
    return await handleFailure(ports, ref, err instanceof Error ? err.message : String(err));
  } finally {
    await ports.releaseLock(ref);
  }
}
