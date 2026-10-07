import { useStore } from "@nanostores/react";
import { CircleAlert, CircleCheck, CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type SubmitEvent } from "react";

import { formatPrice } from "../../../lib/money";
import { shippingFor } from "../pricing";
import { $cart, $cartSubtotal, clearCart } from "../store";
import CartLine from "./CartLine";

/**
 * Checkout con SumUp (flujo portado de menu-la-rueca):
 * form → creating → widget (tarjeta de SumUp) → polling → paid | error.
 * Los importes que se ven acá son orientativos: el servidor recalcula el
 * total contra el catálogo y es el único que decide cuánto se cobra.
 */

type Phase =
  | { readonly kind: "form" }
  | { readonly kind: "creating" }
  | { readonly kind: "widget"; readonly checkoutId: string; readonly ref: string; readonly totalCents: number }
  | { readonly kind: "polling"; readonly ref: string }
  | { readonly kind: "paid"; readonly ref: string }
  | { readonly kind: "error"; readonly message: string; readonly ref?: string };

const SUMUP_SDK_URL = "https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js";
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 20;
const WIDGET_MOUNT_ID = "sumup-card-mount";

declare global {
  interface Window {
    SumUpCard?: {
      mount: (options: {
        checkoutId: string;
        id: string;
        locale?: string;
        onResponse: (type: string, body: unknown) => void;
      }) => void;
    };
  }
}

let sdkPromise: Promise<void> | null = null;

const loadSumUpSdk = (): Promise<void> => {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.SumUpCard) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SUMUP_SDK_URL;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("No se pudo cargar el widget de pago."));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
};

const SESSION_ERRORS: Record<string, string> = {
  invalid_lines: "Algún producto de tu carrito cambió o ya no está disponible. Revisa el carrito y vuelve a intentarlo.",
  payload_too_large: "Tus imágenes pesan demasiado para un solo pedido. Divide el pedido en dos, por favor.",
  bad_request: "Revisa los datos del formulario (email, código postal de 5 dígitos…).",
};

const field =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10";

export default function CheckoutView() {
  const items = useStore($cart);
  const subtotal = useStore($cartSubtotal);
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const pollAttempts = useRef(0);

  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;

  // Vuelta desde un método de pago con redirección (/checkout?ref=…).
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setPhase({ kind: "polling", ref });
  }, []);

  // Monta el widget de tarjeta de SumUp.
  useEffect(() => {
    if (phase.kind !== "widget") return;
    let cancelled = false;

    loadSumUpSdk()
      .then(() => {
        if (cancelled || !window.SumUpCard) return;
        window.SumUpCard.mount({
          checkoutId: phase.checkoutId,
          id: WIDGET_MOUNT_ID,
          locale: "es-ES",
          onResponse: (type) => {
            if (cancelled) return;
            if (type === "success") setPhase({ kind: "polling", ref: phase.ref });
            else if (type === "error") setPhase({ kind: "error", message: "El pago no se pudo completar. Prueba de nuevo.", ref: phase.ref });
          },
        });
      })
      .catch(() => {
        if (!cancelled) setPhase({ kind: "error", message: "No se pudo cargar el widget de pago." });
      });

    return () => {
      cancelled = true;
    };
  }, [phase]);

  // Poll de estado: completa el pedido aunque el webhook se pierda.
  const pollingRef = phase.kind === "polling" ? phase.ref : null;
  useEffect(() => {
    if (!pollingRef) return;
    let cancelled = false;
    pollAttempts.current = 0;

    const poll = async (): Promise<void> => {
      if (cancelled) return;
      pollAttempts.current += 1;
      try {
        const response = await fetch(`/api/checkout/status?ref=${encodeURIComponent(pollingRef)}`);
        const result = (await response.json()) as { status: string };
        if (cancelled) return;
        if (result.status === "paid") {
          clearCart();
          setPhase({ kind: "paid", ref: pollingRef });
          return;
        }
        if (result.status === "failed") {
          setPhase({ kind: "error", message: "No pudimos confirmar el pago. Escríbenos con tu referencia si ya pagaste.", ref: pollingRef });
          return;
        }
      } catch {
        // sigue reintentando
      }
      if (pollAttempts.current >= MAX_POLL_ATTEMPTS) {
        setPhase({ kind: "error", message: "Aún no podemos confirmar el pago. Escríbenos con tu referencia.", ref: pollingRef });
        return;
      }
      window.setTimeout(() => void poll(), POLL_INTERVAL_MS);
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [pollingRef]);

  const onSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "");

    setPhase({ kind: "creating" });
    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: value("name"),
            email: value("email"),
            phone: value("phone"),
            address: value("address"),
            zip: value("zip"),
            city: value("city"),
            province: value("province"),
            notes: value("notes"),
          },
          // Solo referencias + diseño: el precio lo pone el servidor.
          lines: items.map((item) => ({
            slug: item.slug,
            colorHex: item.color.hex,
            size: item.size,
            quantity: item.quantity,
            customization: item.customization,
          })),
        }),
      });

      if (!response.ok) {
        const { error } = (await response.json().catch(() => ({}))) as { error?: string };
        setPhase({ kind: "error", message: SESSION_ERRORS[error ?? ""] ?? "No pudimos iniciar el pago. Prueba de nuevo en un momento." });
        return;
      }

      const session = (await response.json()) as { ref: string; checkoutId: string; totalCents: number };
      setPhase({ kind: "widget", ...session });
    } catch {
      setPhase({ kind: "error", message: "No pudimos iniciar el pago. Revisa tu conexión y prueba de nuevo." });
    }
  };

  if (phase.kind === "paid") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-line p-8 text-center shadow-sm" role="status">
        <CircleCheck className="mx-auto size-16 text-brand" />
        <h2 className="mt-4 text-2xl font-extrabold">¡Pago confirmado!</h2>
        <p className="mt-2 text-ink-soft">
          Tu referencia es <strong className="text-ink break-all">{phase.ref}</strong>. Revisaremos tu diseño antes de estamparlo y te escribiremos si hace
          falta algún ajuste.
        </p>
        <a href="/" className="btn-brand mt-6">Volver a la tienda</a>
      </div>
    );
  }

  if (phase.kind === "polling") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-cloud p-10 text-center" role="status" aria-live="polite">
        <Loader2 className="mx-auto size-10 animate-spin text-brand" />
        <p className="mt-4 text-lg font-extrabold">Confirmando tu pago…</p>
        <p className="mt-1 text-sm text-ink-soft">No cierres esta página.</p>
      </div>
    );
  }

  // Errores POST-pago (hay ref): pantalla propia. Los PRE-pago se muestran
  // dentro del formulario para no desmontarlo y no perder lo que escribió.
  if (phase.kind === "error" && phase.ref) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-brand/30 bg-brand-soft/40 p-8 text-center" role="alert">
        <CircleAlert className="mx-auto size-12 text-brand" />
        <p className="mt-4 font-bold">{phase.message}</p>
        {phase.ref && <p className="mt-2 text-xs break-all text-ink-soft">Referencia: {phase.ref}</p>}
        <button type="button" className="btn-brand mt-6" onClick={() => setPhase({ kind: "form" })}>
          Volver al checkout
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-line p-8 text-center">
        <h2 className="text-2xl font-extrabold">Tu carrito está vacío</h2>
        <p className="mt-2 text-ink-soft">Añade algún producto personalizado para continuar.</p>
        <a href="/tienda" className="btn-brand mt-6">Ir a la tienda</a>
      </div>
    );
  }

  const locked = phase.kind === "creating" || phase.kind === "widget";

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
      <div className="space-y-8">
        {phase.kind === "error" && (
          <p role="alert" className="flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft/50 p-4 text-sm font-semibold text-brand-dark">
            <CircleAlert className="size-5 shrink-0" /> {phase.message}
          </p>
        )}
        <fieldset disabled={locked} className="rounded-3xl border border-line p-6 disabled:opacity-60">
          <legend className="sr-only">Datos de contacto</legend>
          <h2 className="mb-4 text-lg font-extrabold">1. Datos de contacto</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input required name="name" autoComplete="name" maxLength={120} placeholder="Nombre y apellidos" className={`${field} sm:col-span-2`} />
            <input required type="email" name="email" autoComplete="email" placeholder="Email" className={field} />
            <input required type="tel" name="phone" autoComplete="tel" maxLength={30} placeholder="Teléfono" className={field} />
          </div>
        </fieldset>

        <fieldset disabled={locked} className="rounded-3xl border border-line p-6 disabled:opacity-60">
          <legend className="sr-only">Dirección de envío</legend>
          <h2 className="mb-4 text-lg font-extrabold">2. Dirección de envío</h2>
          <div className="grid gap-3 sm:grid-cols-6">
            <input required name="address" autoComplete="street-address" maxLength={200} placeholder="Dirección" className={`${field} sm:col-span-6`} />
            <input required name="zip" autoComplete="postal-code" placeholder="Código postal" inputMode="numeric" pattern="\d{5}" title="5 dígitos" className={`${field} sm:col-span-2`} />
            <input required name="city" autoComplete="address-level2" maxLength={100} placeholder="Ciudad" className={`${field} sm:col-span-2`} />
            <input required name="province" autoComplete="address-level1" maxLength={100} placeholder="Provincia" className={`${field} sm:col-span-2`} />
            <textarea name="notes" rows={2} maxLength={500} placeholder="Notas para el pedido (opcional)" className={`${field} sm:col-span-6`} />
          </div>
        </fieldset>

        <section className="rounded-3xl border border-line p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">3. Pago</h2>
            <span className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
              <ShieldCheck className="size-4 text-brand" /> Pago seguro con SumUp
            </span>
          </div>
          {phase.kind === "widget" ? (
            <div>
              <p className="mb-3 text-sm font-semibold">Total a pagar: {formatPrice(phase.totalCents)}</p>
              <div id={WIDGET_MOUNT_ID} className="min-h-40" />
            </div>
          ) : (
            <p className="flex items-center gap-3 rounded-2xl bg-cloud p-4 text-sm text-ink-soft">
              <CreditCard className="size-6 shrink-0 text-brand" />
              Al continuar verás el formulario seguro de tarjeta. Tus datos de pago los procesa SumUp: nunca pasan por nuestra web.
            </p>
          )}
        </section>
      </div>

      <aside className="rounded-3xl bg-cloud p-6 lg:sticky lg:top-40">
        <h2 className="text-lg font-extrabold">Resumen del pedido</h2>
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <CartLine key={item.id} item={item} compact />
          ))}
        </ul>
        <dl className="mt-2 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-bold">{formatPrice(subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Envío</dt><dd className="font-bold">{shipping === 0 ? "Gratis" : formatPrice(shipping)}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-lg font-extrabold"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
        </dl>
        <p className="mt-1 text-xs text-ink-soft">IVA incluido</p>
        {phase.kind !== "widget" && (
          <button type="submit" disabled={phase.kind === "creating"} className="btn-brand mt-5 w-full whitespace-nowrap">
            {phase.kind === "creating" ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
            {phase.kind === "creating" ? "Preparando el pago…" : `Continuar al pago · ${formatPrice(total)}`}
          </button>
        )}
      </aside>
    </form>
  );
}
