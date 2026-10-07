import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { uploadImage } from "../client/api";

/**
 * Editor visual del blog (Tiptap). Produce HTML que el servidor SANEA antes
 * de guardar: este editor es comodidad, no la barrera de seguridad.
 */

function ToolButton({ onClick, active, disabled, label, children }: { onClick: () => void; active?: boolean; disabled?: boolean; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid size-9 place-items-center rounded-lg transition disabled:opacity-30 ${active ? "bg-ink text-white" : "hover:bg-cloud"}`}
    >
      {children}
    </button>
  );
}

function LinkBar({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [url, setUrl] = useState<string>(editor.getAttributes("link")["href"] ?? "https://");
  const apply = () => {
    const href = url.trim();
    if (!href || href === "https://") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    onClose();
  };
  return (
    <div className="flex gap-2 border-b border-line bg-cloud p-2">
      <input
        autoFocus
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply();
          }
          if (event.key === "Escape") onClose();
        }}
        placeholder="https://… o /tienda"
        className="flex-1 rounded-lg border border-line px-3 py-1.5 text-sm outline-none focus:border-brand"
      />
      <button type="button" onClick={apply} className="rounded-lg bg-ink px-3 text-sm font-bold text-white">Aplicar</button>
      <button type="button" onClick={onClose} className="rounded-lg px-3 text-sm font-bold">Cancelar</button>
    </div>
  );
}

export default function RichTextEditor({ initialHtml, onChange }: { initialHtml: string; onChange: (html: string) => void }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    // Isla client:only: sin SSR, así evitamos el desajuste de hidratación.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      Image,
      Placeholder.configure({ placeholder: "Empieza a escribir tu post… Usa la barra para títulos, listas, enlaces e imágenes." }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: { class: "prose prose-lg max-w-none min-h-[420px] px-6 py-5 outline-none prose-headings:font-extrabold prose-strong:font-extrabold prose-a:text-brand" },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  // Re-render solo cuando cambia el estado de la barra (no en cada tecla).
  // OJO: con immediatelyRender:false, el snapshot de useEditorState queda
  // cacheado con editor=null hasta la primera transacción. Si esperáramos a
  // este estado para pintar el editor, nunca habría transacción: deadlock.
  // Por eso usamos el `editor` del closure como respaldo y NO condicionamos
  // el render a `state`.
  const state = useEditorState({
    editor,
    selector: ({ editor: snapshotEditor }) => {
      const e = snapshotEditor ?? editor;
      return e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null;
    },
  });

  const toolbar = state ?? {
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    h2: false,
    h3: false,
    bullet: false,
    ordered: false,
    quote: false,
    link: false,
    canUndo: false,
    canRedo: false,
  };

  if (!editor) {
    return <div className="grid min-h-[480px] place-items-center rounded-2xl border-2 border-line bg-white"><Loader2 className="size-6 animate-spin text-brand" /></div>;
  }

  const insertImage = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const src = await uploadImage(file, "blog");
      editor.chain().focus().setImage({ src, alt: file.name.replace(/\.[^.]+$/, "") }).run();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  };

  const chain = () => editor.chain().focus();

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-line bg-white focus-within:border-brand">
      <div className="sticky top-0 z-10 flex flex-wrap gap-0.5 border-b border-line bg-white p-1.5" role="toolbar" aria-label="Formato">
        <ToolButton label="Título" active={toolbar.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></ToolButton>
        <ToolButton label="Subtítulo" active={toolbar.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></ToolButton>
        <span className="mx-1 w-px bg-line" />
        <ToolButton label="Negrita" active={toolbar.bold} onClick={() => chain().toggleBold().run()}><Bold className="size-4" /></ToolButton>
        <ToolButton label="Cursiva" active={toolbar.italic} onClick={() => chain().toggleItalic().run()}><Italic className="size-4" /></ToolButton>
        <ToolButton label="Subrayado" active={toolbar.underline} onClick={() => chain().toggleUnderline().run()}><Underline className="size-4" /></ToolButton>
        <ToolButton label="Tachado" active={toolbar.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough className="size-4" /></ToolButton>
        <span className="mx-1 w-px bg-line" />
        <ToolButton label="Lista" active={toolbar.bullet} onClick={() => chain().toggleBulletList().run()}><List className="size-4" /></ToolButton>
        <ToolButton label="Lista numerada" active={toolbar.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered className="size-4" /></ToolButton>
        <ToolButton label="Cita" active={toolbar.quote} onClick={() => chain().toggleBlockquote().run()}><Quote className="size-4" /></ToolButton>
        <ToolButton label="Separador" onClick={() => chain().setHorizontalRule().run()}><Minus className="size-4" /></ToolButton>
        <span className="mx-1 w-px bg-line" />
        <ToolButton label="Enlace" active={toolbar.link} onClick={() => setLinkOpen(true)}><Link2 className="size-4" /></ToolButton>
        {toolbar.link && <ToolButton label="Quitar enlace" onClick={() => chain().unsetLink().run()}><Unlink className="size-4" /></ToolButton>}
        <ToolButton label="Imagen" disabled={uploading} onClick={() => fileInput.current?.click()}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        </ToolButton>
        <span className="ml-auto flex">
          <ToolButton label="Deshacer" disabled={!toolbar.canUndo} onClick={() => chain().undo().run()}><Undo2 className="size-4" /></ToolButton>
          <ToolButton label="Rehacer" disabled={!toolbar.canRedo} onClick={() => chain().redo().run()}><Redo2 className="size-4" /></ToolButton>
        </span>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void insertImage(file);
          }}
        />
      </div>
      {linkOpen && <LinkBar editor={editor} onClose={() => setLinkOpen(false)} />}
      {error && <p className="border-b border-line bg-brand-soft px-4 py-2 text-xs font-bold text-brand-dark">{error}</p>}
      <EditorContent editor={editor} />
    </div>
  );
}
