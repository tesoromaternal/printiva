// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  resolveCanonicalOriginFromValues,
  SiteOriginError,
  type CanonicalOriginValues,
} from "./site-origin";

const attackerRequest = new URL(
  "https://attacker.example/api/checkout/session",
);
const resolve = (values: Partial<CanonicalOriginValues>) =>
  resolveCanonicalOriginFromValues({
    requestUrl: attackerRequest,
    allowLocalRequestOrigin: false,
    ...values,
  });

describe("resolveCanonicalOriginFromValues", () => {
  it("prefers SITE_URL and normalizes its trailing slash", () => {
    expect(
      resolve({
        siteUrl: "https://pizza.example./",
        vercelProductionUrl: "fallback.vercel.app",
      }),
    ).toBe("https://pizza.example");
  });

  it("uses VERCEL_PROJECT_PRODUCTION_URL as an HTTPS fallback", () => {
    expect(
      resolve({ vercelProductionUrl: "menu-pizza-production.vercel.app" }),
    ).toBe("https://menu-pizza-production.vercel.app");
  });

  it.each([
    "http://pizza.example",
    "https://user:password@pizza.example",
    "https://pizza.example/checkout",
    "https://pizza.example?next=evil",
    "https://pizza.example#fragment",
  ])("rejects an unsafe SITE_URL: %s", (siteUrl) => {
    expect(() => resolve({ siteUrl, allowLocalRequestOrigin: true })).toThrow(
      SiteOriginError,
    );
  });

  it.each([
    "https://127.0.0.1",
    "https://127.0.0.2",
    "https://[::1]",
    "https://[::ffff:127.0.0.1]",
    "https://[2001:db8::1]",
    "https://localhost",
    "https://localhost.",
    "https://pizza.localhost",
  ])(
    "rejects a non-public configured hostname in production: %s",
    (siteUrl) => {
      expect(() => resolve({ siteUrl })).toThrow(
        "SITE_URL must use a public DNS hostname in production",
      );
    },
  );

  it("allows only a real loopback request origin in explicit local development", () => {
    expect(
      resolve({
        requestUrl: new URL("http://localhost.:4321/api/checkout/session"),
        allowLocalRequestOrigin: true,
      }),
    ).toBe("http://localhost:4321");
    expect(() => resolve({ allowLocalRequestOrigin: true })).toThrow(
      "Refusing non-loopback request origin",
    );
  });

  it("fails closed when production has no configured canonical origin", () => {
    expect(() => resolve({})).toThrow(
      "Missing SITE_URL / VERCEL_PROJECT_PRODUCTION_URL",
    );
  });
});
