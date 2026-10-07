import { ExternalLink, Eye, Save, Send } from "lucide-react";
import { useState } from "react";

import { slugify } from "../../../lib/slug";
import { apiJson } from "../client/api";
import type { PostInput } from "../schemas";
import { SingleImageField } from "./ImageField";
import RichTextEditor from "./RichTextEditor";
import { Card, DangerConfirm, Field, inputClass, SaveStatus, type SaveState } from "./ui";

interface Props {
  id: number | null;
  initial: PostInput;
  publishedSlug: string | null;
}

export default function PostForm({ id, initial, publishedSlug }: Props) {
  const [values, setValues] = useState<PostInput>(initial);
  const [slugTouched, setSlugTouched] = useState(id !== null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [deleting, setDeleting] = useState(false);
  const [livePath, setLivePath] = useState(publishedSlug ? `/blog/${publishedSlug}` : null);

  const set = <K extends keyof PostInput>(key: K, value: PostInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSave({ kind: "idle" });
  };

  const submit = async (status: PostInput["status"]) => {
    setSave({ kind: "saving" });
    const payload = { ...values, status };
    const result = id === null ? await apiJson<{ id: number }>("/admin/api/posts", "POST", payload) : await apiJson<{ id: number }>(`/admin/api/posts/${id}`, "PUT", payload);

    if (!result.ok) {
      setErrors(result.fields ?? {});
      setSave({ kind: "error", message: result.error ?? "Error" });
      return;
    }
    setErrors({});
    if (id === null && result.data) {
      window.location.href = `/admin/blog/${result.data.id}?creado=1`;
      return;
    }
    setValues(payload);
    setLivePath(status === "published" ? `/blog/${payload.slug}` : null);
    setSave({ kind: "saved" });
  };

  const onDelete = async () => {
    if (id === null) return;
    setDeleting(true);
    const result = await apiJson(`/admin/api/posts/${id}`, "DELETE");
    if (result.ok) window.location.href = "/admin/blog?eliminado=1";
    else {
      setDeleting(false);
      setSave({ kind: "error", message: result.error ?? "No se pudo eliminar" });
    }
  };

  const published = values.status === "published";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(values.status);
      }}
      className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start"
    >
      <div className="space-y-4">
        <input
          required
          maxLength={160}
          value={values.title}
          aria-label="Título del post"
          aria-invalid={Boolean(errors["title"])}
          placeholder="Título del post"
          onChange={(event) => {
            set("title", event.target.value);
            if (!slugTouched) set("slug", slugify(event.target.value));
          }}
          className="w-full rounded-2xl border-2 border-line bg-white px-5 py-4 text-2xl font-black outline-none focus:border-brand aria-[invalid=true]:border-brand"
        />
        {errors["title"] && <p className="text-xs font-bold text-brand-dark">{errors["title"]}</p>}
        <RichTextEditor initialHtml={initial.contentHtml} onChange={(html) => set("contentHtml", html)} />
      </div>

      <aside className="space-y-6 lg:sticky lg:top-6">
        <Card title="Publicación" aside={<span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${published ? "bg-[#D3F2E1] text-[#2a7a4f]" : "bg-sun/30"}`}>{published ? "Publicado" : "Borrador"}</span>}>
          <div className="grid gap-2">
            {!published && (
              <button type="button" onClick={() => void submit("draft")} disabled={save.kind === "saving"} className="btn-ink w-full">
                <Save className="size-4" /> Guardar borrador
              </button>
            )}
            <button type="button" onClick={() => void submit("published")} disabled={save.kind === "saving"} className="btn-brand w-full">
              <Send className="size-4" /> {published ? "Actualizar publicado" : "Publicar"}
            </button>
            {published && (
              <button type="button" onClick={() => void submit("draft")} disabled={save.kind === "saving"} className="text-sm font-bold text-ink-soft hover:text-ink">
                Pasar a borrador (ocultar)
              </button>
            )}
          </div>
          <SaveStatus state={save} />
          {livePath && (
            <a href={livePath} target="_blank" rel="noopener" className="flex items-center justify-center gap-1.5 text-sm font-bold text-ink-soft hover:text-brand">
              <Eye className="size-4" /> Ver en el blog <ExternalLink className="size-3.5" />
            </a>
          )}
        </Card>

        <Card title="Portada">
          <SingleImageField url={values.coverUrl} onChange={(url) => set("coverUrl", url)} folder="blog" label="Subir portada" />
          {values.coverUrl && (
            <Field label="Texto alternativo">
              <input value={values.coverAlt} maxLength={200} onChange={(event) => set("coverAlt", event.target.value)} className={inputClass} />
            </Field>
          )}
        </Card>

        <Card title="SEO">
          <Field label="Slug (URL)" error={errors["slug"]} hint={`printiva.es/blog/${values.slug || "…"}`}>
            <input
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
          <Field label="Extracto" error={errors["excerpt"]} hint={`${values.excerpt.length}/300 · aparece en el listado y en Google.`}>
            <textarea rows={3} maxLength={300} value={values.excerpt} onChange={(event) => set("excerpt", event.target.value)} className={inputClass} />
          </Field>
        </Card>

        {id !== null && (
          <div className="flex justify-center">
            <DangerConfirm label="Eliminar post" confirmLabel={deleting ? "Eliminando…" : "Sí, eliminar"} onConfirm={onDelete} busy={deleting} />
          </div>
        )}
      </aside>
    </form>
  );
}
