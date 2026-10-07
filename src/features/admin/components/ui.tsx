import { CircleCheck, Loader2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

/** Piezas de formulario del panel, con la estética de Printiva. */

export const inputClass =
  "w-full rounded-xl border-2 border-line bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 aria-[invalid=true]:border-brand";

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-extrabold tracking-wide text-ink-soft uppercase">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs font-bold text-brand-dark">{error}</p> : hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-brand" : "bg-line"}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-[1.375rem]" : "left-0.5"}`} />
      </button>
      <span>
        <span className="block text-sm font-bold">{label}</span>
        {hint && <span className="text-xs text-ink-soft">{hint}</span>}
      </span>
    </label>
  );
}

export function Card({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {aside}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

export function SaveStatus({ state }: { state: SaveState }) {
  if (state.kind === "saving")
    return (
      <span className="flex items-center gap-1.5 text-sm font-bold text-ink-soft" role="status">
        <Loader2 className="size-4 animate-spin" /> Guardando…
      </span>
    );
  if (state.kind === "saved")
    return (
      <span className="flex items-center gap-1.5 text-sm font-bold text-[#3FA36B]" role="status">
        <CircleCheck className="size-4" /> Guardado · visible en la tienda en ~1 min
      </span>
    );
  if (state.kind === "error")
    return (
      <span className="flex items-center gap-1.5 text-sm font-bold text-brand-dark" role="alert">
        <TriangleAlert className="size-4" /> {state.message}
      </span>
    );
  return null;
}

/** Confirmación inline para borrar (sin window.confirm, que bloquea la página). */
export function DangerConfirm({ label, confirmLabel, onConfirm, busy }: { label: string; confirmLabel: string; onConfirm: () => void; busy?: boolean }) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none rounded-full px-4 py-2 text-sm font-bold text-brand-dark hover:bg-brand-soft">{label}</summary>
      <div className="mt-2 flex items-center gap-2 rounded-2xl bg-brand-soft p-3 text-sm">
        <span className="font-semibold">¿Seguro? No se puede deshacer.</span>
        <button type="button" disabled={busy} onClick={onConfirm} className="rounded-full bg-brand-dark px-4 py-1.5 font-bold text-white disabled:opacity-50">
          {confirmLabel}
        </button>
      </div>
    </details>
  );
}
