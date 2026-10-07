import { describe, expect, it, vi } from "vitest";

import type { Product } from "../../catalog/types";
import type { StoredOrder } from "../orders.repository";
import type { PaidOrder } from "../types";
import { settleCheckout, type SettlePorts } from "./settle";
import type { SumUpCheckout } from "./types";

const products: Product[] = [
  {
    slug: "camiseta-personalizada",
    name: "Camiseta personalizada",
    summary: "",
    description: "",
    categorySlug: "camisetas",
    kind: "tshirt",
    priceCents: 1990,
    colors: [{ name: "Negro", hex: "#1F2125" }],
    sizes: ["M"],
    occasions: [],
    art: "heart",
    images: [],
    badge: null,
    featured: true,
  },
];

// 2 × 19,90 = 39,80 + 4,95 de envío = 44,75 €
const storedOrder = (overrides: Partial<StoredOrder> = {}): StoredOrder => ({
  ref: "REF123",
  status: "pending",
  amountCents: 4475,
  customer: {
    name: "Ana",
    email: "ana@example.com",
    phone: "600000000",
    address: "Calle 1",
    zip: "28001",
    city: "Madrid",
    province: "Madrid",
    notes: "",
  },
  lines: [
    {
      slug: "camiseta-personalizada",
      colorHex: "#1F2125",
      size: "M",
      quantity: 2,
      customization: { image: null, text: "Hola", textFont: "sans", textColor: null, imageScale: 1, imageOffset: 0 },
    },
  ],
  ...overrides,
});

const paidCheckout = (overrides: Partial<SumUpCheckout> = {}): SumUpCheckout => ({
  id: "sumup-checkout-id",
  checkout_reference: "REF123",
  amount: 44.75,
  currency: "EUR",
  merchant_code: "MC1",
  status: "PAID",
  date: "2026-10-05T00:00:00Z",
  transactions: [],
  ...overrides,
});

const basePorts = (overrides: Partial<SettlePorts> = {}): SettlePorts => ({
  acquireLock: async () => true,
  releaseLock: async () => {},
  getStoredOrder: async () => storedOrder(),
  recordFailure: vi.fn().mockResolvedValue({ attempt: 1 }),
  getCheckoutByRef: async () => paidCheckout(),
  getProducts: async () => products,
  markPaid: vi.fn().mockResolvedValue(undefined),
  notifyOrderPaid: vi.fn().mockResolvedValue(undefined),
  notifyOpsAlert: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("settleCheckout — lock", () => {
  it("returns pending without touching any other port when the lock is already held", async () => {
    const getCheckoutByRef = vi.fn();
    const result = await settleCheckout("REF123", basePorts({ acquireLock: async () => false, getCheckoutByRef }));

    expect(result).toEqual({ status: "pending" });
    expect(getCheckoutByRef).not.toHaveBeenCalled();
  });

  it("always releases the lock, even when settlement throws", async () => {
    const releaseLock = vi.fn().mockResolvedValue(undefined);
    await settleCheckout(
      "REF123",
      basePorts({
        releaseLock,
        getCheckoutByRef: async () => {
          throw new Error("network down");
        },
      }),
    );

    expect(releaseLock).toHaveBeenCalledWith("REF123");
  });
});

describe("settleCheckout — payment status", () => {
  it("returns pending when SumUp has not confirmed the checkout yet", async () => {
    const result = await settleCheckout("REF123", basePorts({ getCheckoutByRef: async () => paidCheckout({ status: "PENDING" }) }));
    expect(result).toEqual({ status: "pending" });
  });

  it("returns pending when the checkout does not exist yet", async () => {
    const result = await settleCheckout("REF123", basePorts({ getCheckoutByRef: async () => null }));
    expect(result).toEqual({ status: "pending" });
  });
});

describe("settleCheckout — three-way total guard", () => {
  it("aborts and records a failure on a mismatch — nothing is marked paid or notified", async () => {
    const markPaid = vi.fn();
    const notifyOrderPaid = vi.fn();
    const recordFailure = vi.fn().mockResolvedValue({ attempt: 1 });
    const notifyOpsAlert = vi.fn().mockResolvedValue(undefined);

    const result = await settleCheckout(
      "REF123",
      basePorts({
        getStoredOrder: async () => storedOrder({ amountCents: 9999 }),
        markPaid,
        notifyOrderPaid,
        recordFailure,
        notifyOpsAlert,
      }),
    );

    expect(markPaid).not.toHaveBeenCalled();
    expect(notifyOrderPaid).not.toHaveBeenCalled();
    expect(recordFailure).toHaveBeenCalledOnce();
    expect(notifyOpsAlert).toHaveBeenCalledOnce();
    expect(result).toEqual({ status: "retrying", attempt: 1 });
  });

  it("aborts when SumUp charged a different amount than the order", async () => {
    const markPaid = vi.fn();
    const result = await settleCheckout("REF123", basePorts({ getCheckoutByRef: async () => paidCheckout({ amount: 1 }), markPaid }));

    expect(markPaid).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "retrying", attempt: 1 });
  });

  it("aborts when the price changed in the catalog while paying", async () => {
    const markPaid = vi.fn();
    const result = await settleCheckout(
      "REF123",
      basePorts({ getProducts: async () => products.map((p) => ({ ...p, priceCents: 2490 })), markPaid }),
    );

    expect(markPaid).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "retrying", attempt: 1 });
  });

  it("marks paid and notifies with customer + print design when all three totals agree", async () => {
    const markPaid = vi.fn().mockResolvedValue(undefined);
    const notifyOrderPaid = vi.fn().mockResolvedValue(undefined);

    const result = await settleCheckout("REF123", basePorts({ markPaid, notifyOrderPaid }));

    expect(markPaid).toHaveBeenCalledWith("REF123", "sumup-checkout-id", expect.any(String));
    const [order] = notifyOrderPaid.mock.calls[0] as [PaidOrder];
    expect(order.totalCents).toBe(4475);
    expect(order.shippingCents).toBe(495);
    expect(order.customer.zip).toBe("28001");
    expect(order.items[0]?.customization.text).toBe("Hola");
    expect(result).toEqual({ status: "paid", reference: "REF123" });
  });

  it("aborts when an order line no longer resolves against the live catalog", async () => {
    const markPaid = vi.fn();
    const result = await settleCheckout("REF123", basePorts({ getProducts: async () => [], markPaid }));

    expect(markPaid).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "retrying", attempt: 1 });
  });
});

describe("settleCheckout — idempotency", () => {
  it("a second call for an already-paid order returns paid without re-writing or re-notifying", async () => {
    const markPaid = vi.fn();
    const notifyOrderPaid = vi.fn();

    const result = await settleCheckout("REF123", basePorts({ getStoredOrder: async () => storedOrder({ status: "paid" }), markPaid, notifyOrderPaid }));

    expect(markPaid).not.toHaveBeenCalled();
    expect(notifyOrderPaid).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "paid", reference: "REF123" });
  });
});

describe("settleCheckout — retry ceiling", () => {
  it("reports failed once the failure attempt count reaches the max", async () => {
    const result = await settleCheckout(
      "REF123",
      basePorts({ getStoredOrder: async () => null, recordFailure: vi.fn().mockResolvedValue({ attempt: 5 }) }),
    );

    expect(result).toEqual({ status: "failed", ref: "REF123" });
  });
});
