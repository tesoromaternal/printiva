import { CircleCheck, Send } from "lucide-react";
import { useState, type SubmitEvent } from "react";

// Mockup: no envía todavía (pendiente de proveedor de email).
const field =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10";

export default function ContactForm() {
  const [sent, setSent] = useState(false);

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
  };

  if (sent) {
    return (
      <div className="rounded-3xl bg-cloud p-8 text-center">
        <CircleCheck className="mx-auto size-12 text-brand" />
        <p className="mt-3 text-xl font-extrabold">¡Mensaje recibido!</p>
        <p className="mt-1 text-sm text-ink-soft">Te respondemos muy pronto. (Demo: no se ha enviado nada.)</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input required name="name" placeholder="Nombre *" autoComplete="name" className={field} />
        <input required type="email" name="email" placeholder="Email *" autoComplete="email" className={field} />
      </div>
      <input name="subject" placeholder="Asunto" className={field} />
      <textarea required name="message" rows={5} placeholder="Cuéntanos tu idea…" className={field} />
      <button type="submit" className="btn-brand">
        Enviar mensaje <Send className="size-4" />
      </button>
    </form>
  );
}
