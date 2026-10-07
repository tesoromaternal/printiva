import type { z } from "astro/zod";

import { fieldErrors } from "./schemas";

export const json = (body: unknown, status = 200) => Response.json(body, { status });

/**
 * Lee y valida un body JSON. Devuelve los datos o una Response 400/413 lista
 * para devolver (con errores por campo para pintarlos en el formulario).
 */
export async function parseJson<T extends z.ZodType>(
  request: Request,
  schema: T,
  maxBytes = 300_000,
): Promise<{ data: z.infer<T> } | { response: Response }> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) {
    return { response: json({ error: "payload_too_large" }, 413) };
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { response: json({ error: "bad_request" }, 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { response: json({ error: "invalid", fields: fieldErrors(parsed.error) }, 400) };
  return { data: parsed.data };
}

export const parseId = (value: string | undefined): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};
