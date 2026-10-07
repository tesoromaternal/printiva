import { ExternalLink, Plus, Save, X } from "lucide-react";
import { useState, type SubmitEvent } from "react";

import { slugify } from "../../../lib/slug";
import ProductCard from "../../catalog/components/ProductCard";
import { ART_LABEL, KIND_LABEL } from "../../catalog/labels";
import type { Category, MockupKind, Occasion, PrintArt, Product, ProductImage } from "../../catalog/types";
import { apiJson } from "../client/api";
import type { ProductInput } from "../schemas";
import { GalleryField } from "./ImageField";
import { Card, DangerConfirm, Field, inputClass, SaveStatus, Toggle, type SaveState } from "./ui";

const SIZE_PRESETS: { label: string; sizes: string[] }[] = [
  { label: "Adulto", sizes: ["S", "M", "L", "XL", "XXL"] },
  { label: "Niño", sizes: ["2-4 años", "4-6 años", "6-8 años", "8-10 años"] },
  { label: "Bebé", sizes: ["0-3 m", "3-6 m", "6-12 m", "12-18 m"] },
  { label: "Sin tallas", sizes: [] },
];

const COLOR_PRESETS = [
  { name: "Blanco", hex: "#FFFFFF" },
  { name: "Negro", hex: "#1F2125" },
  { name: "Gris jaspeado", hex: "#B8BCC4" },
  { name: "Rojo", hex: "#E5383B" },
  { name: "Rosa", hex: "#F7A8C8" },
  { name: "Fucsia", hex: "#EC1E79" },
  { name: "Azul", hex: "#2F7BEA" },
  { name: "Azul marino", hex: "#1E2A4A" },
  { name: "Verde", hex: "#3FA36B" },
  { name: "Natural", hex: "#EFE4CF" },
];

export interface ProductFormValues extends ProductInput {
  kind: MockupKind;
  art: PrintArt;
}

interface Props {
  id: number | null;
  initial: ProductFormValues;
  categories: Category[];
  occasions: Occasion[];
}

const centsToEuros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const eurosToCents = (value: string) => Math.round(Number(value.replace(",", ".")) * 100);

export default function ProductForm({ id, initial, categories, occasions }: Props) {
  const [values, setValues] = useState<ProductFormValues>(initial);
  const [price, setPrice] = useState(centsToEuros(initial.priceCents));
  const [slugTouched, setSlugTouched] = useState(id !== null);
  const [newSize, setNewSize] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [deleting, setDeleting] = useState(false);

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSave({ kind: "idle" });
  };

  const priceCents = eurosToCents(price);
  const priceValid = /^\d+([.,]\d{1,2})?$/.test(price.trim()) && Number.isFinite(priceCents);

  const onSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!priceValid) {
      setErrors({ priceCents: "Precio no válido (ej. 19,90)" });
      return;
    }
    setSave({ kind: "saving" });
    const payload: ProductInput = { ...values, priceCents, badge: values.badge?.trim() || null };
    const result = id === null ? await apiJson<{ id: number }>("/admin/api/products", "POST", payload) : await apiJson<{ id: number }>(`/admin/api/products/${id}`, "PUT", payload);

    if (!result.ok) {
      setErrors(result.fields ?? {});
      setSave({ kind: "error", message: result.error ?? "Error" });
      return;
    }
    setErrors({});
    if (id === null && result.data) {
      window.location.href = `/admin/productos/${result.data.id}?creado=1`;
      return;
    }
    setSave({ kind: "saved" });
  };

  const onDelete = async () => {
    if (id === null) return;
    setDeleting(true);
    const result = await apiJson(`/admin/api/products/${id}`, "DELETE");
    if (result.ok) window.location.href = "/admin/productos?eliminado=1";
    else {
      setDeleting(false);
      setSave({ kind: "error", message: result.error ?? "No se pudo eliminar" });
    }
  };

  // La vista previa usa la MISMA tarjeta que la tienda.
  const preview: Product = { ...values, priceCents: priceValid ? priceCents : 0, images: values.images as ProductImage[], badge: values.badge || null };

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="space-y-6">
        <Card title="Información">
          <Field label="Nombre" htmlFor="name" error={errors["name"]}>
            <input
              id="name"
              required
              maxLength={120}
              value={values.name}
              aria-invalid={Boolean(errors["name"])}
              onChange={(event) => {
                set("name", event.target.value);
                if (!slugTouched) set("slug", slugify(event.target.value));
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Slug (URL)" htmlFor="slug" error={errors["slug"]} hint={id !== null ? "Cambiarlo rompe los enlaces ya compartidos a este producto." : `printiva.es/producto/${values.slug || "…"}`}>
            <input
              id="slug"
              required
              value={values.slug}
              aria-invalid={Boolean(errors["slug"])}
              onChange={(event) => {
                setSlugTouched(true);
                set("slug", slugify(event.target.value));
              }}
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="Resumen" htmlFor="summary" error={errors["summary"]} hint="Una línea: aparece bajo el título del producto.">
            <input id="summary" required maxLength={200} value={values.summary} onChange={(event) => set("summary", event.target.value)} className={inputClass} />
          </Field>
          <Field label="Descripción" htmlFor="description" error={errors["description"]} hint="Materiales, medidas, cuidados… Los saltos de línea se respetan.">
            <textarea id="description" rows={6} maxLength={5000} value={values.description} onChange={(event) => set("description", event.target.value)} className={inputClass} />
          </Field>
        </Card>

        <Card title="Fotos">
          <GalleryField images={values.images as ProductImage[]} onChange={(images) => set("images", images)} />
          <p className="text-xs text-ink-soft">Sin fotos, la tienda muestra el dibujo del producto ({KIND_LABEL[values.kind]}) con el diseño de ejemplo.</p>
        </Card>

        <Card title="Precio y organización">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Precio (€, IVA incl.)" htmlFor="price" error={errors["priceCents"]}>
              <input id="price" inputMode="decimal" required value={price} aria-invalid={!priceValid} onChange={(event) => { setPrice(event.target.value); setSave({ kind: "idle" }); }} className={inputClass} />
            </Field>
            <Field label="Categoría" htmlFor="category" error={errors["categorySlug"]}>
              <select id="category" value={values.categorySlug} onChange={(event) => set("categorySlug", event.target.value)} className={inputClass}>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>{category.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Etiqueta" htmlFor="badge" hint="Ej. Nuevo, Más vendido. Vacío = sin etiqueta.">
              <input id="badge" maxLength={30} value={values.badge ?? ""} onChange={(event) => set("badge", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Dibujo (sin fotos)" htmlFor="kind">
              <div className="grid grid-cols-2 gap-2">
                <select id="kind" value={values.kind} onChange={(event) => set("kind", event.target.value as MockupKind)} className={inputClass}>
                  {Object.entries(KIND_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select aria-label="Diseño de ejemplo" value={values.art} onChange={(event) => set("art", event.target.value as PrintArt)} className={inputClass}>
                  {Object.entries(ART_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </Field>
          </div>
        </Card>

        <Card title="Colores" aside={<span className="text-xs text-ink-soft">{values.colors.length} colores</span>}>
          {errors["colors"] && <p className="text-xs font-bold text-brand-dark">{errors["colors"]}</p>}
          <ul className="space-y-2">
            {values.colors.map((color, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  type="color"
                  value={color.hex}
                  aria-label={`Color ${index + 1}`}
                  onChange={(event) => set("colors", values.colors.map((c, i) => (i === index ? { ...c, hex: event.target.value.toUpperCase() } : c)))}
                  className="size-10 shrink-0 cursor-pointer rounded-lg border border-line"
                />
                <input
                  value={color.name}
                  maxLength={40}
                  aria-label="Nombre del color"
                  onChange={(event) => set("colors", values.colors.map((c, i) => (i === index ? { ...c, name: event.target.value } : c)))}
                  className={inputClass}
                />
                <button type="button" onClick={() => set("colors", values.colors.filter((_, i) => i !== index))} className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-brand-soft hover:text-brand" aria-label="Quitar color">
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-bold text-ink-soft">Añadir:</span>
            {COLOR_PRESETS.filter((preset) => !values.colors.some((c) => c.hex.toUpperCase() === preset.hex)).map((preset) => (
              <button key={preset.hex} type="button" title={preset.name} aria-label={`Añadir ${preset.name}`} onClick={() => set("colors", [...values.colors, preset])} className="size-7 rounded-full border border-ink/15 transition hover:scale-110" style={{ background: preset.hex }} />
            ))}
            <button type="button" onClick={() => set("colors", [...values.colors, { name: "Nuevo color", hex: "#888888" }])} className="flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs font-bold hover:border-ink">
              <Plus className="size-3.5" /> Personalizado
            </button>
          </div>
        </Card>

        <Card title="Tallas">
          <div className="flex flex-wrap gap-1.5">
            {SIZE_PRESETS.map((preset) => (
              <button key={preset.label} type="button" onClick={() => set("sizes", preset.sizes)} className="rounded-full border border-line px-3 py-1 text-xs font-bold hover:border-ink">
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {values.sizes.length === 0 && <span className="text-sm text-ink-soft">Sin tallas (talla única).</span>}
            {values.sizes.map((size) => (
              <span key={size} className="flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-sm font-bold text-white">
                {size}
                <button type="button" onClick={() => set("sizes", values.sizes.filter((s) => s !== size))} aria-label={`Quitar ${size}`}>
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newSize}
              maxLength={20}
              placeholder="Otra talla (ej. 3XL)"
              onChange={(event) => setNewSize(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (newSize.trim() && !values.sizes.includes(newSize.trim())) set("sizes", [...values.sizes, newSize.trim()]);
                  setNewSize("");
                }
              }}
              className={inputClass}
            />
          </div>
        </Card>

        <Card title="Ocasiones de regalo">
          <div className="flex flex-wrap gap-2">
            {occasions.map((occasion) => {
              const on = values.occasions.includes(occasion.slug);
              return (
                <button
                  key={occasion.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("occasions", on ? values.occasions.filter((o) => o !== occasion.slug) : [...values.occasions, occasion.slug])}
                  className={`rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition ${on ? "border-brand bg-brand text-white" : "border-line hover:border-ink"}`}
                >
                  {occasion.emoji} {occasion.name}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-6">
        <Card title="Publicación">
          <Toggle checked={values.active} onChange={(value) => set("active", value)} label="Visible en la tienda" hint="Apagado: oculto y no se puede comprar." />
          <Toggle checked={values.featured} onChange={(value) => set("featured", value)} label="Destacado" hint="Aparece en “Productos destacados” del inicio." />
          <button type="submit" disabled={save.kind === "saving"} className="btn-brand w-full">
            <Save className="size-4" /> {id === null ? "Crear producto" : "Guardar cambios"}
          </button>
          <SaveStatus state={save} />
          {id !== null && values.active && (
            <a href={`/producto/${initial.slug}`} target="_blank" rel="noopener" className="flex items-center justify-center gap-1.5 text-sm font-bold text-ink-soft hover:text-brand">
              Ver en la tienda <ExternalLink className="size-3.5" />
            </a>
          )}
        </Card>

        <Card title="Vista previa">
          <div className="pointer-events-none">
            <ProductCard product={preview} />
          </div>
        </Card>

        {id !== null && (
          <div className="flex justify-center">
            <DangerConfirm label="Eliminar producto" confirmLabel={deleting ? "Eliminando…" : "Sí, eliminar"} onConfirm={onDelete} busy={deleting} />
          </div>
        )}
      </aside>
    </form>
  );
}
