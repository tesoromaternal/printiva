import type { APIRoute } from "astro";

import { json, parseJson } from "../../../../features/admin/http";
import { postInput } from "../../../../features/admin/schemas";
import { createPost, PostSlugTakenError } from "../../../../features/blog/repository";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const parsed = await parseJson(request, postInput, 400_000);
  if ("response" in parsed) return parsed.response;

  try {
    return json({ id: await createPost(parsed.data) }, 201);
  } catch (error) {
    if (error instanceof PostSlugTakenError) return json({ error: "invalid", fields: { slug: "Ya existe un post con este slug." } }, 409);
    console.error("create post failed", error);
    return json({ error: "server_error" }, 500);
  }
};
