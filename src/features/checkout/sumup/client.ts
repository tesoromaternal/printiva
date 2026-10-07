/**
 * Cliente REST crudo (fetch) contra la API de SumUp. SOLO SERVIDOR — se
 * importa exclusivamente desde src/lib/sumup/checkout.ts, settle.ts y las
 * rutas API; nunca desde una isla de React.
 *
 * Los secretos se leen vía el escape hatch `getSecret()` de
 * `astro:env/server` (no los exports tipados del schema), así este módulo
 * funciona igual haya corrido o no `astro sync`.
 */
import { getSecret } from "astro:env/server";

export class SumUpError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SumUpError";
  }
}

interface SumUpEnv {
  readonly apiKey: string;
  readonly merchantCode: string;
}

export function assertEnv(): SumUpEnv {
  const apiKey = getSecret("SUMUP_API_KEY");
  const merchantCode = getSecret("SUMUP_MERCHANT_CODE");

  if (!apiKey || !merchantCode) {
    throw new SumUpError(
      "Missing SUMUP_API_KEY / SUMUP_MERCHANT_CODE — server misconfigured",
    );
  }

  return { apiKey, merchantCode };
}

const BASE_URL = "https://api.sumup.com";

interface SumUpProblem {
  readonly message?: string;
  readonly detail?: string;
  readonly error_code?: string;
}

/** Llamada REST cruda a la API de SumUp. Lanza SumUpError en cualquier respuesta no-2xx o fallo de red. */
export async function sumup<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiKey } = assertEnv();
  const url = `${BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch (cause) {
    throw new SumUpError(`SumUp API request failed (network): ${url}`, cause);
  }

  if (!response.ok) {
    let detail = "";
    try {
      const problem = (await response.json()) as SumUpProblem;
      detail = problem.message ?? problem.detail ?? problem.error_code ?? "";
    } catch {
      // La respuesta no era JSON — seguimos con solo el status code.
    }
    throw new SumUpError(
      `SumUp API HTTP ${response.status} — ${url}${detail ? `: ${detail}` : ""}`,
    );
  }

  const text = await response.text();
  return (text.length > 0 ? JSON.parse(text) : undefined) as T;
}
