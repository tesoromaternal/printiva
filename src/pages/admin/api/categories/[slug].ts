import type { APIRoute } from "astro";

import { updateCategory } from "../../../../features/admin/catalog.repository";
import { json, parseJson } from "../../../../features/admin/http";
import { categoryInput } from "../../../../features/admin/schemas";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  const parsed = await parseJson(request, categoryInput);
  if ("response" in parsed) return parsed.response;

  try {
    await updateCategory(params.slug ?? "", parsed.data);
    return json({ ok: true });
  } catch (error) {
    console.error("update category failed", error);
    return json({ error: "server_error" }, 500);
  }
};
