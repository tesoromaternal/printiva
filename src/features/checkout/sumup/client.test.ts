// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { assertEnv, sumup, SumUpError } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("assertEnv", () => {
  it("returns apiKey/merchantCode when both are configured", () => {
    expect(assertEnv()).toEqual({
      apiKey: "test",
      merchantCode: "test",
    });
  });
});

describe("sumup", () => {
  it("sends the Authorization header and returns the parsed JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{"id":"abc"}'),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sumup<{ id: string }>("/v0.1/checkouts/abc");

    expect(result).toEqual({ id: "abc" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.sumup.com/v0.1/checkouts/abc");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer test",
    );
  });

  it("returns undefined for an empty response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("") }),
    );

    expect(await sumup("/v0.1/checkouts")).toBeUndefined();
  });

  it("throws SumUpError on a non-2xx response, including the SumUp error detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ message: "invalid amount" }),
      }),
    );

    await expect(sumup("/v0.1/checkouts")).rejects.toThrow(
      /HTTP 422.*invalid amount/,
    );
  });

  it("throws SumUpError on a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connection refused")),
    );

    await expect(sumup("/v0.1/checkouts")).rejects.toThrow(SumUpError);
  });
});
