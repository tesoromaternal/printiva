import { Check, ImagePlus, Minus, Plus, ShoppingCart, Trash2, Type } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";

import { formatPrice } from "../../lib/money";
import { addToCart } from "../cart/store";
import ProductMockup, { type PrintFont } from "../catalog/components/ProductMockup";
import type { Product } from "../catalog/types";
import { ImageError, toPrintThumbnail } from "./image";

/**
 * Un solo personalizador para dos pantallas:
 * - "product": ficha de producto (producto fijo).
 * - "wizard":  /crea-tu-producto, con paso 1 "Elige producto".
 * La vista previa es el mismo ProductMockup de las tarjetas, en vivo.
 */

interface Props {
  products: Product[];
  initialSlug?: string;
  mode: "product" | "wizard";
}

const FONTS: { id: PrintFont; label: string; family: string }[] = [
  { id: "sans", label: "Moderna", family: "font-sans font-extrabold" },
  { id: "script", label: "Manuscrita", family: "font-script" },
  { id: "display", label: "Impacto", family: "font-display tracking-wide" },
];

const TEXT_COLORS: { label: string; hex: string | null }[] = [
  { label: "Automático", hex: null },
  { label: "Negro", hex: "#14161F" },
  { label: "Blanco", hex: "#FFFFFF" },
  { label: "Fucsia", hex: "#EC1E79" },
  { label: "Azul", hex: "#22B8E6" },
  { label: "Amarillo", hex: "#FFC93C" },
];

const PERKS = ["Personalización incluida", "Preparado bajo pedido", "Diferentes tallas y colores", "Diseño personalizado"];

const MAX_TEXT = 40;

function Step({ n, title, show, children }: { n: number; title: string; show: boolean; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-extrabold tracking-wide uppercase">
        {show && <span className="grid size-6 place-items-center rounded-full bg-brand text-xs text-white">{n}</span>}
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function Customizer({ products, initialSlug, mode }: Props) {
  const wizard = mode === "wizard";
  const [slug, setSlug] = useState(initialSlug ?? products[0]?.slug ?? "");
  const product = products.find((p) => p.slug === slug) ?? products[0];

  const [colorIndex, setColorIndex] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imageOffset, setImageOffset] = useState(0);
  const [text, setText] = useState("");
  const [textFont, setTextFont] = useState<PrintFont>("sans");
  const [textColor, setTextColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  // -1 = vista previa en vivo; 0..n = foto real del producto.
  const [view, setView] = useState(-1);

  // Si el cliente toca algo de la personalización mientras mira una foto,
  // volvemos a la vista previa para que vea su cambio.
  useEffect(() => {
    setView(-1);
  }, [slug, colorIndex, image, text, textFont, textColor, imageScale, imageOffset]);
  const fileInput = useRef<HTMLInputElement>(null);

  // /crea-tu-producto?producto=taza-personalizada preselecciona el producto.
  useEffect(() => {
    if (!wizard) return;
    const fromUrl = new URLSearchParams(window.location.search).get("producto");
    if (fromUrl && products.some((p) => p.slug === fromUrl)) setSlug(fromUrl);
  }, [wizard, products]);

  // Al cambiar de producto, color y talla del anterior pueden no existir.
  useEffect(() => {
    setColorIndex(0);
    setSize(null);
    setError(null);
  }, [slug]);

  if (!product) return null;

  const color = product.colors[colorIndex] ?? product.colors[0] ?? { name: "Blanco", hex: "#FFFFFF" };
  const hasCustomization = Boolean(image) || text.trim().length > 0;
  const photo = view >= 0 ? product.images[view] : undefined;
  let step = 1;
  const next = () => (wizard ? ++step : step);

  const selectProduct = (nextSlug: string) => {
    setSlug(nextSlug);
    const url = new URL(window.location.href);
    url.searchParams.set("producto", nextSlug);
    window.history.replaceState(null, "", url);
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setLoadingImage(true);
    try {
      setImage(await toPrintThumbnail(file));
      setImageScale(1);
      setImageOffset(0);
    } catch (cause) {
      setError(cause instanceof ImageError ? cause.message : "No pudimos procesar la imagen.");
    } finally {
      setLoadingImage(false);
    }
  };

  const onAdd = () => {
    if (product.sizes.length > 0 && !size) {
      setError("Elige una talla para continuar.");
      return;
    }
    if (!hasCustomization) {
      setError("Sube una imagen o añade un texto para personalizarlo.");
      return;
    }
    const ok = addToCart({
      slug: product.slug,
      name: product.name,
      kind: product.kind,
      priceCents: product.priceCents,
      color,
      size,
      quantity,
      customization: { image, text: text.trim(), textFont, textColor, imageScale, imageOffset },
    });
    if (!ok) {
      setError("Tu carrito está lleno de imágenes. Finaliza la compra o quita algún producto.");
      return;
    }
    setError(null);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* Vista previa */}
      <div className="lg:sticky lg:top-40 lg:self-start">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-cloud">
          {photo ? (
            <img src={photo.url} alt={photo.alt || product.name} className="h-full w-full object-cover" />
          ) : (
          <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#fff_0,transparent_55%)]" />
          <ProductMockup
            kind={product.kind}
            color={color.hex}
            art={hasCustomization ? "none" : product.art}
            image={image}
            text={text}
            textFont={textFont}
            textColor={textColor}
            imageScale={imageScale}
            imageOffset={imageOffset}
            className="relative h-full w-full p-4 sm:p-8"
            title={`Vista previa: ${product.name} ${color.name}`}
          />
          <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold shadow-sm">
            {hasCustomization ? "✨ Así quedaría" : "Diseño de ejemplo"}
          </span>
          </>
          )}
        </div>
        {product.images.length > 0 && (
          <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto" role="tablist" aria-label="Imágenes del producto">
            <button
              type="button"
              role="tab"
              aria-selected={view === -1}
              onClick={() => setView(-1)}
              className={`grid size-16 shrink-0 place-items-center rounded-xl border-2 bg-cloud text-[0.6rem] font-extrabold leading-tight ${view === -1 ? "border-brand" : "border-transparent"}`}
            >
              ✨<br />Tu diseño
            </button>
            {product.images.map((image, index) => (
              <button
                key={image.url}
                type="button"
                role="tab"
                aria-selected={view === index}
                aria-label={`Foto ${index + 1}`}
                onClick={() => setView(index)}
                className={`size-16 shrink-0 overflow-hidden rounded-xl border-2 ${view === index ? "border-brand" : "border-transparent"}`}
              >
                <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
        {!wizard && (
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-brand" /> {perk}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Controles */}
      <div className="space-y-7">
        {wizard ? (
          <Step n={step} title="Elige producto" show>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {products.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => selectProduct(p.slug)}
                  aria-pressed={p.slug === product.slug}
                  className={`rounded-2xl border-2 p-2 text-center text-xs font-bold transition ${p.slug === product.slug ? "border-brand bg-brand-soft/50" : "border-line hover:border-ink-soft/40"}`}
                >
                  <ProductMockup kind={p.kind} color={p.colors[0]?.hex ?? "#FFFFFF"} art={p.art} className="mx-auto aspect-square w-full" />
                  <span className="mt-1 block leading-tight">{p.name.replace(" personalizada", "").replace(" personalizado", "")}</span>
                </button>
              ))}
            </div>
          </Step>
        ) : (
          <header>
            {product.badge && <span className="mb-2 inline-block rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">{product.badge}</span>}
            <h1 className="text-3xl font-black sm:text-4xl">{product.name}</h1>
            <p className="mt-2 text-3xl font-extrabold text-brand">{formatPrice(product.priceCents)}</p>
            <p className="mt-3 text-ink-soft">{product.summary}</p>
          </header>
        )}

        {wizard && (
          <div className="flex items-baseline justify-between rounded-2xl bg-cloud px-4 py-3">
            <span className="font-bold">{product.name}</span>
            <span className="text-xl font-extrabold text-brand">{formatPrice(product.priceCents)}</span>
          </div>
        )}

        <Step n={next()} title={product.sizes.length > 0 ? "Elige color y talla" : "Elige color"} show={wizard}>
          <div>
            <p className="mb-2 text-sm">
              Color: <strong>{color.name}</strong>
            </p>
            <div className="flex flex-wrap gap-2.5">
              {product.colors.map((c, index) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColorIndex(index)}
                  aria-label={c.name}
                  aria-pressed={index === colorIndex}
                  title={c.name}
                  className={`size-9 rounded-full border border-ink/15 ring-offset-2 transition hover:scale-110 ${index === colorIndex ? "ring-2 ring-brand" : ""}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
          {product.sizes.length > 0 && (
            <div>
              <p className="mt-4 mb-2 text-sm">
                Talla: <strong>{size ?? "elige una"}</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSize(s);
                      setError(null);
                    }}
                    aria-pressed={s === size}
                    className={`min-w-12 rounded-xl border-2 px-3 py-2 text-sm font-bold transition ${s === size ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Step>

        <Step n={next()} title={wizard ? "Sube tu imagen o diseño" : "¿Qué quieres estampar?"} show={wizard}>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onFile} aria-label="Subir imagen" />
          {image ? (
            <div className="space-y-3 rounded-2xl border border-line p-4">
              <div className="flex items-center gap-3">
                <img src={image} alt="Tu imagen" className="size-14 rounded-lg bg-cloud object-contain" />
                <p className="flex-1 text-sm font-semibold">Imagen lista ✨</p>
                <button type="button" onClick={() => fileInput.current?.click()} className="text-sm font-bold text-brand hover:underline">
                  Cambiar
                </button>
                <button type="button" onClick={() => setImage(null)} className="grid size-8 place-items-center rounded-full hover:bg-cloud" aria-label="Quitar imagen">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <label className="flex items-center gap-3 text-sm font-semibold">
                <span className="w-16">Tamaño</span>
                <input type="range" min={0.4} max={1.6} step={0.05} value={imageScale} onChange={(e) => setImageScale(Number(e.target.value))} className="flex-1 accent-brand" />
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold">
                <span className="w-16">Posición</span>
                <input type="range" min={-1} max={1} step={0.05} value={imageOffset} onChange={(e) => setImageOffset(Number(e.target.value))} className="flex-1 accent-brand" />
              </label>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={loadingImage}
              className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-line p-5 text-left transition hover:border-brand hover:bg-brand-soft/30"
            >
              <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
                <ImagePlus className="size-6" />
              </span>
              <span>
                <span className="block font-bold">{loadingImage ? "Procesando imagen…" : "📷 Subir imagen"}</span>
                <span className="text-xs text-ink-soft">JPG, PNG o WebP · PNG con fondo transparente queda genial</span>
              </span>
            </button>
          )}
        </Step>

        <Step n={next()} title="Añade texto" show={wizard}>
          <label className="relative block">
            <Type className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
            <span className="sr-only">Texto a estampar</span>
            <input
              value={text}
              maxLength={MAX_TEXT}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              placeholder="✏️ Escribe tu frase, nombre o fecha"
              className="w-full rounded-xl border border-line py-3 pr-16 pl-11 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
            <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs text-ink-soft">
              {text.length}/{MAX_TEXT}
            </span>
          </label>
          {text.trim() && (
            <div className="flex flex-wrap items-center gap-2">
              {FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => setTextFont(font.id)}
                  aria-pressed={font.id === textFont}
                  className={`rounded-full border-2 px-4 py-1.5 text-sm ${font.family} ${font.id === textFont ? "border-brand bg-brand-soft/50" : "border-line"}`}
                >
                  {font.label}
                </button>
              ))}
              <span className="mx-1 h-6 w-px bg-line" />
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setTextColor(c.hex)}
                  title={c.label}
                  aria-label={`Color de texto ${c.label}`}
                  aria-pressed={c.hex === textColor}
                  className={`size-7 rounded-full border border-ink/15 ring-offset-2 ${c.hex === textColor ? "ring-2 ring-brand" : ""}`}
                  style={{ background: c.hex ?? "conic-gradient(#14161F 0 50%, #fff 0)" }}
                />
              ))}
            </div>
          )}
        </Step>

        {wizard && (
          <Step n={next()} title="Visualiza cómo quedaría" show>
            <p className="text-sm text-ink-soft">
              {hasCustomization
                ? "Mira la vista previa: ajusta tamaño, posición, tipografía y color hasta que te encante."
                : "Sube una imagen o escribe un texto y lo verás al instante en la vista previa."}
            </p>
          </Step>
        )}

        <Step n={next()} title={wizard ? "Añadir al carrito" : "Cantidad"} show={wizard}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border-2 border-line">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="grid size-11 place-items-center rounded-full hover:bg-cloud" aria-label="Quitar uno">
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center font-extrabold" aria-live="polite">{quantity}</span>
              <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} className="grid size-11 place-items-center rounded-full hover:bg-cloud" aria-label="Añadir uno">
                <Plus className="size-4" />
              </button>
            </div>
            <button type="button" onClick={onAdd} className="btn-brand flex-1 py-3.5">
              {added ? <Check className="size-5" /> : <ShoppingCart className="size-5" />}
              {added ? "¡Añadido!" : `Añadir al carrito · ${formatPrice(product.priceCents * quantity)}`}
            </button>
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-brand-soft px-4 py-2.5 text-sm font-semibold text-brand-dark">
              {error}
            </p>
          )}
        </Step>

        {wizard && (
          <ul className="grid grid-cols-2 gap-2 border-t border-line pt-5 text-sm font-semibold">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-brand" /> {perk}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
