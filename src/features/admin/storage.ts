/**
 * Fotos del catálogo y del blog en Vercel Blob (store PÚBLICO: son imágenes
 * de la tienda). Sin Blob configurado y SOLO en desarrollo, se guardan en
 * public/uploads para poder probar el admin antes de crear el store.
 */
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { del, put } from "@vercel/blob";
import { getSecret } from "astro:env/server";

export const UPLOAD_FOLDERS = ["products", "categories", "blog"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // < 4,5 MB de body en Vercel
const EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/avif": "avif",
};

export class UploadError extends Error {}

// Astro carga el .env en import.meta.env, no en process.env: el SDK no vería
// el token en local si no se lo pasamos explícito.
const blobToken = () => getSecret("BLOB_READ_WRITE_TOKEN") || undefined;
const blobConfigured = () => Boolean(blobToken() || process.env["BLOB_STORE_ID"]);

export async function uploadImage(file: File, folder: UploadFolder): Promise<string> {
  const ext = EXTENSIONS[file.type];
  if (!ext) throw new UploadError("Formato no admitido: usa JPG, PNG, WebP o AVIF.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("La imagen supera los 4 MB.");

  const name = `${folder}/${randomUUID()}.${ext}`;

  if (blobConfigured()) {
    const blob = await put(name, file, {
      access: "public",
      contentType: file.type,
      token: blobToken(),
      // Nombre único por UUID: nunca pisamos una foto que ya está publicada.
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return blob.url;
  }

  if (import.meta.env.DEV) {
    const target = path.join(process.cwd(), "public", "uploads", name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await file.arrayBuffer()));
    return `/uploads/${name}`;
  }

  throw new UploadError("Vercel Blob no está configurado (falta BLOB_READ_WRITE_TOKEN).");
}

/** Best-effort: si falla, queda un archivo huérfano, nunca un error para el admin. */
export async function deleteImages(urls: readonly string[]): Promise<void> {
  const blobs = urls.filter((url) => /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(url));
  const local = urls.filter((url) => url.startsWith("/uploads/") && !url.includes(".."));

  try {
    if (blobs.length > 0 && blobConfigured()) await del(blobs, { token: blobToken() });
  } catch (error) {
    console.error("deleteImages (blob) failed", error);
  }
  if (import.meta.env.DEV) {
    await Promise.all(local.map((url) => unlink(path.join(process.cwd(), "public", url)).catch(() => {})));
  }
}
