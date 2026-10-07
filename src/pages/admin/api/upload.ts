import type { APIRoute } from "astro";

import { json } from "../../../features/admin/http";
import { MAX_UPLOAD_BYTES, UPLOAD_FOLDERS, UploadError, uploadImage, type UploadFolder } from "../../../features/admin/storage";

export const prerender = false;

// Protegido por el middleware (401 sin sesión) y por el checkOrigin de Astro
// (multipart desde otra web = 403).
export const POST: APIRoute = async ({ request }) => {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64_000) {
    return json({ error: "La imagen supera los 4 MB." }, 413);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const folder = String(form?.get("folder") ?? "");

  if (!(file instanceof File) || !UPLOAD_FOLDERS.includes(folder as UploadFolder)) {
    return json({ error: "Petición inválida." }, 400);
  }

  try {
    return json({ url: await uploadImage(file, folder as UploadFolder) });
  } catch (error) {
    if (error instanceof UploadError) return json({ error: error.message }, 400);
    console.error("upload failed", error);
    return json({ error: "No se pudo subir la imagen." }, 500);
  }
};
