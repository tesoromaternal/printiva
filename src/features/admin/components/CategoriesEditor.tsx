import { ExternalLink, Save } from "lucide-react";
import { useState } from "react";

import ProductMockup from "../../catalog/components/ProductMockup";
import { KIND_LABEL, plural } from "../../catalog/labels";
import type { Category, MockupKind } from "../../catalog/types";
import { apiJson } from "../client/api";
import type { CategoryInput } from "../schemas";
import { SingleImageField } from "./ImageField";
import { Field, inputClass, SaveStatus, type SaveState } from "./ui";

function CategoryRow({ category, productCount }: { category: Category; productCount: number }) {
  const [values, setValues] = useState<CategoryInput & { kind: MockupKind }>({
    name: category.name,
    description: category.description,
    kind: category.kind,
    tint: category.tint,
    imageUrl: category.imageUrl,
  });
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSave({ kind: "idle" });
  };

  const onSave = async () => {
    setSave({ kind: "saving" });
    const result = await apiJson(`/admin/api/categories/${category.slug}`, "PUT", values);
    setErrors(result.fields ?? {});
    setSave(result.ok ? { kind: "saved" } : { kind: "error", message: result.error ?? "Error" });
  };

  return (
    <li className="grid gap-5 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-[120px_1fr]">
      <div className="flex flex-col items-center gap-2">
        <span className="grid aspect-square w-24 place-items-center overflow-hidden rounded-full" style={{ background: values.tint }}>
          {values.imageUrl ? (
            <img src={values.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ProductMockup kind={values.kind} color="#FFFFFF" className="h-[82%] w-[82%]" />
          )}
        </span>
        <span className="text-center text-xs font-bold text-ink-soft">{plural(productCount, "producto", "productos")}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={errors["name"]}>
          <input value={values.name} maxLength={60} onChange={(event) => set("name", event.target.value)} className={inputClass} />
        </Field>
        <Field label="Color de fondo">
          <div className="flex gap-2">
            <input type="color" value={values.tint} onChange={(event) => set("tint", event.target.value.toUpperCase())} className="size-11 shrink-0 cursor-pointer rounded-lg border border-line" />
            <select value={values.kind} onChange={(event) => set("kind", event.target.value as MockupKind)} className={inputClass} aria-label="Dibujo si no hay foto">
              {Object.entries(KIND_LABEL).map(([kind, label]) => (
                <option key={kind} value={kind}>Dibujo: {label}</option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="Descripción" error={errors["description"]}>
          <textarea rows={2} maxLength={300} value={values.description} onChange={(event) => set("description", event.target.value)} className={`${inputClass} sm:col-span-2`} />
        </Field>
        <Field label="Foto del círculo (opcional)">
          <SingleImageField url={values.imageUrl} onChange={(url) => set("imageUrl", url)} folder="categories" label="Subir foto" rounded />
        </Field>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="button" onClick={onSave} disabled={save.kind === "saving"} className="btn-ink">
            <Save className="size-4" /> Guardar
          </button>
          <a href={`/tienda/${category.slug}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-brand">
            /tienda/{category.slug} <ExternalLink className="size-3.5" />
          </a>
          <SaveStatus state={save} />
        </div>
      </div>
    </li>
  );
}

export default function CategoriesEditor({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  return (
    <ul className="space-y-4">
      {categories.map((category) => (
        <CategoryRow key={category.slug} category={category} productCount={counts[category.slug] ?? 0} />
      ))}
    </ul>
  );
}
