/** Cliente del panel: fetch JSON + subida de imágenes optimizadas. */

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  fields?: Record<string, string>;
}

export async function apiJson<T>(url: string, method: "POST" | "PUT" | "DELETE", body?: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 401) {
      // Sesión vencida: al login, sin perder silenciosamente lo editado.
      return { ok: false, error: "Tu sesión expiró. Copia tus cambios y vuelve a entrar." };
    }
    const data = (await response.json().catch(() => ({}))) as T & { error?: string; fields?: Record<string, string> };
    if (!response.ok) {
      return { ok: false, error: data.error === "invalid" ? "Revisa los campos marcados." : "No se pudo guardar. Prueba de nuevo.", fields: data.fields };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Sin conexión con el servidor." };
  }
}

/**
 * Reduce la foto en el navegador (máx. `maxSide` px, WebP) antes de subirla:
 * una foto de móvil de 8 MB queda en ~300 KB, cabe en el límite de 4,5 MB de
 * Vercel y la tienda carga rápido.
 */
export async function optimizeImage(file: File, maxSide = 1600): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("El archivo no es una imagen.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("No se pudo leer la imagen.");
  });
  try {
    let side = maxSide;
    for (let attempt = 0; attempt < 5; attempt++) {
      const ratio = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * ratio);
      canvas.height = Math.round(bitmap.height * ratio);
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
      if (blob && blob.size <= 3.8 * 1024 * 1024) {
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
      }
      side = Math.round(side * 0.75);
    }
  } finally {
    bitmap.close();
  }
  throw new Error("La imagen es demasiado pesada incluso optimizada.");
}

export async function uploadImage(file: File, folder: "products" | "categories" | "blog", maxSide?: number): Promise<string> {
  const optimized = await optimizeImage(file, maxSide);
  const form = new FormData();
  form.set("file", optimized);
  form.set("folder", folder);
  const response = await fetch("/admin/api/upload", { method: "POST", body: form });
  const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !data.url) throw new Error(data.error ?? "No se pudo subir la imagen.");
  return data.url;
}
