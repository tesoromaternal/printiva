import { describe, expect, it } from "vitest";

import { hashPassword, hashToken, newSessionToken, safeEqual, verifyPassword } from "./crypto";

describe("hashPassword / verifyPassword", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("estampa-2026");
    expect(await verifyPassword("estampa-2026", hash)).toBe(true);
    expect(await verifyPassword("estampa-2027", hash)).toBe(false);
  });

  it("never stores the password and salts every hash", async () => {
    const a = await hashPassword("misma-clave");
    const b = await hashPassword("misma-clave");
    expect(a).not.toContain("misma-clave");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt:16384:8:1:")).toBe(true);
  });

  it.each(["", "sha256:abc", "scrypt:16384:8:1::", "basura", "scrypt:1:1:1:c2FsdA==:aGFzaA=="])(
    "returns false (never throws) for a malformed stored hash: %s",
    async (stored) => {
      expect(await verifyPassword("x", stored)).toBe(false);
    },
  );
});

describe("safeEqual", () => {
  it("compares strings of any length", () => {
    expect(safeEqual("admin", "admin")).toBe(true);
    expect(safeEqual("admin", "admin2")).toBe(false);
    expect(safeEqual("", "admin")).toBe(false);
  });
});

describe("session tokens", () => {
  it("are random, URL-safe and only their hash is stored", () => {
    const token = newSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newSessionToken()).not.toBe(token);
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });
});
