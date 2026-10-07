import { MAX_IMAGE_CHARS } from "../checkout/resolve";

const MAX_SIDE = 520;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

export class ImageError extends Error {}

/**
 * Reduce la imagen subida antes de guardarla: el carrito vive en localStorage
 * (~5 MB) y una foto de móvil pesa más que eso. PNG/WebP conservan la
 * transparencia (clave para estampar diseños), el resto va a JPEG.
 */
export async function toPrintThumbnail(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new ImageError("El archivo tiene que ser una imagen (JPG, PNG o WebP).");
  if (file.size > MAX_FILE_BYTES) throw new ImageError("La imagen supera los 15 MB.");

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new ImageError("No pudimos leer la imagen. Prueba con otro archivo.");
  });

  const keepAlpha = file.type === "image/png" || file.type === "image/webp";
  const canvas = document.createElement("canvas");
  let side = MAX_SIDE;

  try {
    // Mismo tope que valida el servidor: si un PNG muy detallado se pasa,
    // reducimos hasta que entre en vez de fallar recién al pagar.
    for (let attempt = 0; attempt < 6; attempt++) {
      const ratio = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * ratio);
      canvas.height = Math.round(bitmap.height * ratio);
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
      context?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const dataUrl = keepAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85);
      if (dataUrl.length <= MAX_IMAGE_CHARS) return dataUrl;
      side = Math.round(side * 0.8);
    }
  } finally {
    bitmap.close();
  }
  throw new ImageError("La imagen tiene demasiado detalle. Prueba con otra o en JPG.");
}
