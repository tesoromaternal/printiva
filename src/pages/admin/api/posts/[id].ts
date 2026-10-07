import type { APIRoute } from "astro";

import { json, parseId, parseJson } from "../../../../features/admin/http";
import { postInput } from "../../../../features/admin/schemas";
import { deletePost, PostSlugTakenError, updatePost } from "../../../../features/blog/repository";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  const id = parseId(params.id);
  if (!id) return json({ error: "not_found" }, 404);

  const parsed = await parseJson(request, postInput, 400_000);
  if ("response" in parsed) return parsed.response;

  try {
    await updatePost(id, parsed.data);
    return json({ id });
  } catch (error) {
    if (error instanceof PostSlugTakenError) return json({ error: "invalid", fields: { slug: "Ya existe un post con este slug." } }, 409);
    console.error("update post failed", error);
    return json({ error: "server_error" }, 500);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = parseId(params.id);
  if (!id) return json({ error: "not_found" }, 404);
  await deletePost(id);
  return json({ ok: true });
};
