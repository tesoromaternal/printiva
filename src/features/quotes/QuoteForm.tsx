import { CircleCheck, Send } from "lucide-react";
import { useState, type SubmitEvent } from "react";

/**
 * MOCKUP: aún no envía. La tabla quote_requests ya existe en el schema; cuando
 * pasemos a output "server" esto hace POST a /api/presupuesto y se guarda en Turso.
 */

const PRODUCTS = ["Camisetas", "Polos", "Sudaderas", "Bolsas", "Tazas", "Botellas", "Gorras", "Ropa laboral", "Merchandising"];

const field =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10";

export default function QuoteForm() {
  const [selected, setSelected] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (product: string) =>
    setSelected((current) => (current.includes(product) ? current.filter((p) => p !== product) : [...current, product]));

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selected.length === 0) {
      setError("Marca al menos un producto.");
      return;
    }
    setError(null);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
        <CircleCheck className="mx-auto size-14 text-brand" />
        <h3 className="mt-3 text-2xl font-extrabold">¡Solicitud enviada!</h3>
        <p className="mt-2 text-ink-soft">Te enviaremos tu presupuesto en menos de 24 h laborables.</p>
        <p className="mt-4 text-xs font-semibold text-ink-soft">(Demo: el formulario todavía no envía datos.)</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <input required name="company" placeholder="Empresa *" autoComplete="organization" className={field} />
        <input required name="contact" placeholder="Persona de contacto *" autoComplete="name" className={field} />
        <input required type="email" name="email" placeholder="Email *" autoComplete="email" className={field} />
        <input type="tel" name="phone" placeholder="Teléfono" autoComplete="tel" className={field} />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-bold">¿Qué necesitas?</legend>
        <div className="flex flex-wrap gap-2">
          {PRODUCTS.map((product) => (
            <button
              key={product}
              type="button"
              onClick={() => toggle(product)}
              aria-pressed={selected.includes(product)}
              className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition ${selected.includes(product) ? "border-brand bg-brand text-white" : "border-line hover:border-ink"}`}
            >
              {product}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-2 block text-sm font-bold">¿Cuántas unidades aproximadamente?</span>
        <input required type="number" name="units" min={1} placeholder="Ej. 50" className={field} />
      </label>
      <textarea name="message" rows={4} placeholder="Cuéntanos tu proyecto: colores, logo, fechas, evento…" className={field} />
      {error && <p role="alert" className="text-sm font-semibold text-brand-dark">{error}</p>}
      <button type="submit" className="btn-ink w-full py-3.5 text-base sm:w-auto">
        Solicitar presupuesto <Send className="size-4" />
      </button>
    </form>
  );
}
