/**
 * Persistencia del checkout en Turso. Cumple el mismo contrato que kv.ts
 * (Upstash) en menu-la-rueca, pero sobre la tabla `orders`:
 * - sesión  → fila con status 'pending' (+ order_items con el diseño)
 * - lock    → UPDATE atómico sobre settle_lock_until
 * - dedupe  → status 'paid'
 */
import { and, eq, isNull, lt, or } from "drizzle-orm";

import { db } from "../../db/client";
import { orderItems, orders } from "../../db/schema";
import type { CheckoutLine, Customer, ResolvedOrder } from "./types";

const LOCK_TTL_MS = 60_000;

export interface StoredOrder {
  readonly ref: string;
  readonly status: "pending" | "paid";
  readonly customer: Customer;
  readonly lines: readonly CheckoutLine[];
  readonly amountCents: number;
}

export async function createPendingOrder(ref: string, customer: Customer, resolved: ResolvedOrder): Promise<void> {
  // batch = una transacción: nunca queda un pedido sin sus líneas.
  await db.batch([
    db.insert(orders).values({
      ref,
      customerName: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      zip: customer.zip,
      city: customer.city,
      province: customer.province,
      notes: customer.notes || null,
      subtotalCents: resolved.subtotalCents,
      shippingCents: resolved.shippingCents,
      amountCents: resolved.totalCents,
    }),
    db.insert(orderItems).values(
      resolved.items.map((item) => ({
        orderRef: ref,
        productSlug: item.slug,
        productName: item.productName,
        colorName: item.colorName,
        colorHex: item.colorHex,
        size: item.size,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        printImage: item.customization.image,
        printText: item.customization.text,
        printFont: item.customization.textFont,
        printTextColor: item.customization.textColor,
        imageScale: item.customization.imageScale,
        imageOffset: item.customization.imageOffset,
      })),
    ),
  ]);
}

export async function getStoredOrder(ref: string): Promise<StoredOrder | null> {
  const [order] = await db.select().from(orders).where(eq(orders.ref, ref)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderRef, ref)).orderBy(orderItems.id);

  return {
    ref: order.ref,
    status: order.status,
    amountCents: order.amountCents,
    customer: {
      name: order.customerName,
      email: order.email,
      phone: order.phone,
      address: order.address,
      zip: order.zip,
      city: order.city,
      province: order.province,
      notes: order.notes ?? "",
    },
    lines: items.map((item) => ({
      slug: item.productSlug,
      colorHex: item.colorHex,
      size: item.size,
      quantity: item.quantity,
      customization: {
        image: item.printImage,
        text: item.printText,
        textFont: item.printFont as CheckoutLine["customization"]["textFont"],
        textColor: item.printTextColor,
        imageScale: item.imageScale,
        imageOffset: item.imageOffset,
      },
    })),
  };
}

/** Equivalente a SET NX EX 60: true solo si esta llamada tomó el lock. */
export async function acquireLock(ref: string): Promise<boolean> {
  const now = Date.now();
  const result = await db
    .update(orders)
    .set({ settleLockUntil: now + LOCK_TTL_MS })
    .where(and(eq(orders.ref, ref), or(isNull(orders.settleLockUntil), lt(orders.settleLockUntil, now))));
  return result.rowsAffected === 1;
}

export async function releaseLock(ref: string): Promise<void> {
  await db.update(orders).set({ settleLockUntil: null }).where(eq(orders.ref, ref));
}

/** Marca pagado solo si seguía 'pending': un segundo settle nunca reescribe. */
export async function markPaid(ref: string, sumupCheckoutId: string, paidAt: string): Promise<void> {
  await db
    .update(orders)
    .set({ status: "paid", sumupCheckoutId, paidAt, lastError: null })
    .where(and(eq(orders.ref, ref), eq(orders.status, "pending")));
}

export async function recordFailure(ref: string, error: string): Promise<{ readonly attempt: number }> {
  const [current] = await db.select({ attempts: orders.failureAttempts }).from(orders).where(eq(orders.ref, ref)).limit(1);
  const attempt = (current?.attempts ?? 0) + 1;
  await db.update(orders).set({ failureAttempts: attempt, lastError: error.slice(0, 1000) }).where(eq(orders.ref, ref));
  return { attempt };
}
