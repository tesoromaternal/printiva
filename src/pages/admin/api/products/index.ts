import type { APIRoute } from "astro";

import { createProduct, SlugTakenError } from "../../../../features/admin/catalog.repository";
import { json, parseJson } from "../../../../features/admin/http";
import { productInput } from "../../../../features/admin/schemas";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const parsed = await parseJson(request, productInput);
  if ("response" in parsed) return parsed.response;

  try {
    return json({ id: await createProduct(parsed.data) }, 201);
  } catch (error) {
    if (error instanceof SlugTakenError) return json({ error: "invalid", fields: { slug: "Ya existe un producto con este slug." } }, 409);
    console.error("create product failed", error);
    return json({ error: "server_error" }, 500);
  }
};
