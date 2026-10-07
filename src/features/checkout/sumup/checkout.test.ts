import { beforeEach, describe, expect, it, vi } from "vitest";

const { sumupMock } = vi.hoisted(() => ({ sumupMock: vi.fn() }));

vi.mock("./client", () => ({
  assertEnv: () => ({ apiKey: "test-key", merchantCode: "merchant-code" }),
  sumup: sumupMock,
}));

import {
  buildCheckoutRedirectUrl,
  centsToMajorAmount,
  createCheckout,
  majorAmountToCents,
  newRef,
} from "./checkout";

beforeEach(() => {
  sumupMock.mockReset();
});

describe("newRef", () => {
  it("produces a 22-char base64url string (16 random bytes, no padding)", () => {
    const ref = newRef();
    expect(ref).toHaveLength(22);
    expect(ref).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("produces distinct refs across calls", () => {
    const refs = new Set(Array.from({ length: 20 }, () => newRef()));
    expect(refs.size).toBe(20);
  });
});

describe("cents <-> major amount conversion", () => {
  it("round-trips integer cents", () => {
    expect(centsToMajorAmount(1990)).toBe(19.9);
    expect(majorAmountToCents(19.9)).toBe(1990);
  });

  it("avoids float drift on the inverse conversion", () => {
    expect(majorAmountToCents(centsToMajorAmount(1990))).toBe(1990);
  });
});

describe("SumUp checkout URLs", () => {
  it("builds an absolute checkout URL that keeps the ref", () => {
    expect(buildCheckoutRedirectUrl("https://pizza.example", "REF123")).toBe(
      "https://pizza.example/checkout?ref=REF123",
    );
  });

  it("encodes the ref instead of allowing it to alter the redirect destination", () => {
    const redirectUrl = buildCheckoutRedirectUrl(
      "https://pizza.example",
      "REF&next=https://evil.example",
    );

    expect(redirectUrl).toBe(
      "https://pizza.example/checkout?ref=REF%26next%3Dhttps%3A%2F%2Fevil.example",
    );
    expect(new URL(redirectUrl).origin).toBe("https://pizza.example");
  });
});

describe("createCheckout", () => {
  it("sends both the webhook return_url and the browser redirect_url", async () => {
    sumupMock.mockResolvedValue({ id: "sumup-checkout-id" });

    await createCheckout({
      ref: "REF123",
      amountCents: 1900,
      webhookUrl: "https://pizza.example/api/sumup/webhook",
      redirectUrl: "https://pizza.example/checkout?ref=REF123",
    });

    expect(sumupMock).toHaveBeenCalledWith("/v0.1/checkouts", {
      method: "POST",
      body: JSON.stringify({
        checkout_reference: "REF123",
        amount: 19,
        currency: "EUR",
        merchant_code: "merchant-code",
        return_url: "https://pizza.example/api/sumup/webhook",
        redirect_url: "https://pizza.example/checkout?ref=REF123",
      }),
    });
  });
});
