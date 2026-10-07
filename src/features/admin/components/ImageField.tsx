import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

import type { ProductImage } from "../../catalog/types";
import { uploadImage } from "../client/api";

type Folder = "products" | "categories" | "blog";

function useUploader(folder: Folder, maxSide?: number) {
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: File[]): Promise<string[]> => {
    setError(null);
    setBusy((n) => n + files.length);
    const urls: string[] = [];
    // Secuencial: no saturamos la conexión con 10 fotos a la vez.
    for (const file of files) {
      try {
        urls.push(await uploadImage(file, folder, maxSide));
      } catch (cause) {
        setError(`${file.name}: ${cause instanceof Error ? cause.message : "error al subir"}`);
      } finally {
        setBusy((n) => n - 1);
      }
    }
    return urls;
  };

  return { busy, error, upload };
}

function DropZone({ onFiles, busy, multiple, label }: { onFiles: (files: File[]) => void; busy: number; multiple: boolean; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith("image/"));
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`flex w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed p-5 text-center text-sm transition ${over ? "border-brand bg-brand-soft/40" : "border-line hover:border-brand hover:bg-brand-soft/20"}`}
      >
        {busy > 0 ? <Loader2 className="size-6 animate-spin text-brand" /> : <ImagePlus className="size-6 text-brand" />}
        <span className="font-bold">{busy > 0 ? `Subiendo ${busy}…` : label}</span>
        <span className="text-xs text-ink-soft">Arrastra o haz clic · se optimizan solas a WebP</span>
      </button>
    </>
  );
}

/** Galería del producto: subir varias, ordenar (la primera es la principal), texto alternativo y quitar. */
export function GalleryField({ images, onChange }: { images: ProductImage[]; onChange: (images: ProductImage[]) => void }) {
  const { busy, error, upload } = useUploader("products");
  const latest = useRef(images);
  latest.current = images;

  const move = (from: number, to: number) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    if (item) next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <li key={image.url} className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="relative aspect-square bg-cloud">
                <img src={image.url} alt={image.alt} className="h-full w-full object-cover" />
                {index === 0 && (
                  <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[0.65rem] font-bold text-white">
                    <Star className="size-3" /> Principal
                  </span>
                )}
              </div>
              <div className="space-y-2 p-2">
                <input
                  value={image.alt}
                  onChange={(event) => onChange(images.map((img, i) => (i === index ? { ...img, alt: event.target.value } : img)))}
                  placeholder="Texto alternativo (SEO)"
                  maxLength={200}
                  className="w-full rounded-lg border border-line px-2 py-1 text-xs outline-none focus:border-brand"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button type="button" disabled={index === 0} onClick={() => move(index, index - 1)} className="grid size-7 place-items-center rounded-lg hover:bg-cloud disabled:opacity-30" aria-label="Mover a la izquierda">
                      <ArrowLeft className="size-4" />
                    </button>
                    <button type="button" disabled={index === images.length - 1} onClick={() => move(index, index + 1)} className="grid size-7 place-items-center rounded-lg hover:bg-cloud disabled:opacity-30" aria-label="Mover a la derecha">
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                  <button type="button" onClick={() => onChange(images.filter((_, i) => i !== index))} className="grid size-7 place-items-center rounded-lg text-brand-dark hover:bg-brand-soft" aria-label="Quitar foto">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {images.length < 12 && (
        <DropZone
          multiple
          busy={busy}
          label="Añadir fotos"
          onFiles={async (files) => {
            const urls = await upload(files.slice(0, 12 - images.length));
            // latest: mientras subía, el usuario pudo reordenar o quitar fotos.
            onChange([...latest.current, ...urls.map((url) => ({ url, alt: "" }))]);
          }}
        />
      )}
      {error && <p className="text-xs font-bold text-brand-dark">{error}</p>}
    </div>
  );
}

/** Una sola imagen (portada de post, foto de categoría). */
export function SingleImageField({ url, onChange, folder, label, rounded }: { url: string | null; onChange: (url: string | null) => void; folder: Folder; label: string; rounded?: boolean }) {
  const { busy, error, upload } = useUploader(folder, folder === "categories" ? 800 : 1600);

  return (
    <div className="space-y-2">
      {url ? (
        <div className="flex items-center gap-3">
          <img src={url} alt="" className={`size-20 bg-cloud object-cover ${rounded ? "rounded-full" : "rounded-xl"}`} />
          <button type="button" onClick={() => onChange(null)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-brand-dark hover:bg-brand-soft">
            <Trash2 className="size-4" /> Quitar
          </button>
        </div>
      ) : (
        <DropZone
          multiple={false}
          busy={busy}
          label={label}
          onFiles={async (files) => {
            const [uploaded] = await upload(files.slice(0, 1));
            if (uploaded) onChange(uploaded);
          }}
        />
      )}
      {error && <p className="text-xs font-bold text-brand-dark">{error}</p>}
    </div>
  );
}
