import type { APIRoute } from "astro";

import { deleteProduct, SlugTakenError, updateProduct } from "../../../../features/admin/catalog.repository";
import { json, parseId, parseJson } from "../../../../features/admin/http";
import { productInput } from "../../../../features/admin/schemas";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  const id = parseId(params.id);
  if (!id) return json({ error: "not_found" }, 404);

  const parsed = await parseJson(request, productInput);
  if ("response" in parsed) return parsed.response;

  try {
    await updateProduct(id, parsed.data);
    return json({ id });
  } catch (error) {
    if (error instanceof SlugTakenError) return json({ error: "invalid", fields: { slug: "Ya existe un producto con este slug." } }, 409);
    console.error("update product failed", error);
    return json({ error: "server_error" }, 500);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = parseId(params.id);
  if (!id) return json({ error: "not_found" }, 404);
  await deleteProduct(id);
  return json({ ok: true });
};
