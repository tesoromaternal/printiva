import { useState, type SubmitEvent } from "react";

// Mockup: no envía nada todavía. Cuando haya proveedor (Brevo, Resend…)
// se cambia el submit por un fetch a /api/newsletter.
export default function NewsletterForm() {
  const [sent, setSent] = useState(false);

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
  };

  if (sent) {
    return <p className="rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold">¡Gracias! Te avisaremos de novedades 💌</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex overflow-hidden rounded-full border border-white/25 bg-white/5 focus-within:border-white">
      <label className="sr-only" htmlFor="newsletter-email">Tu email</label>
      <input
        id="newsletter-email"
        type="email"
        required
        placeholder="Tu email…"
        className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/50"
      />
      <button type="submit" className="bg-brand px-5 text-sm font-bold hover:bg-brand-dark">
        Enviar
      </button>
    </form>
  );
}
