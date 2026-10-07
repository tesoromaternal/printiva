/**
 * Aviso por email (Resend) cuando SumUp confirma un pago. Best-effort y
 * no-throw a propósito: el pedido ya quedó marcado como pagado por
 * settleCheckout ANTES de llamar a esto; un fallo de envío nunca debe hacer
 * fallar ni reintentar el pago — solo queda log en Vercel.
 *
 * A diferencia de menu-la-rueca, acá viaja texto que escribe el cliente
 * (nombre, dirección, frase a estampar): TODO se escapa antes de ir al HTML.
 */
import { getSecret } from "astro:env/server";
import { Resend } from "resend";

import { formatPrice } from "../../lib/money";
import type { PaidOrder } from "./types";

let client: Resend | null = null;

function getClient(): Resend {
  if (client) return client;
  const apiKey = getSecret("RESEND_API_KEY");
  if (!apiKey) throw new Error("Missing RESEND_API_KEY — server misconfigured");
  client = new Resend(apiKey);
  return client;
}

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

const FONT_LABEL = { sans: "Moderna", script: "Manuscrita", display: "Impacto" } as const;

const imageFilename = (ref: string, index: number, dataUrl: string) =>
  `${ref}-linea-${index + 1}.${dataUrl.startsWith("data:image/png") ? "png" : "jpg"}`;

export function renderOrderEmailHtml(order: PaidOrder): string {
  const { customer } = order;
  const rows = order.items
    .map((item, index) => {
      const print = [
        item.customization.image ? `🖼️ Imagen adjunta: <code>${imageFilename(order.reference, index, item.customization.image)}</code>` : "",
        item.customization.text
          ? `✏️ Texto: “${escapeHtml(item.customization.text)}” (${FONT_LABEL[item.customization.textFont]}${item.customization.textColor ? `, ${item.customization.textColor}` : ", color auto"})`
          : "",
      ]
        .filter(Boolean)
        .join("<br>");
      return `
        <tr>
          <td><strong>${escapeHtml(item.productName)}</strong><br>
            ${escapeHtml(item.colorName)}${item.size ? ` · Talla ${escapeHtml(item.size)}` : ""}<br>
            <small>${print}</small></td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">${formatPrice(item.lineTotalCents)}</td>
        </tr>`;
    })
    .join("");

  return `
    <h1>Nuevo pedido pagado 🎉</h1>
    <p>Referencia: <strong>${escapeHtml(order.reference)}</strong> · Pagado: ${escapeHtml(order.paidAt)}</p>
    <h2>Envío</h2>
    <p>${escapeHtml(customer.name)}<br>
      ${escapeHtml(customer.address)}<br>
      ${escapeHtml(customer.zip)} ${escapeHtml(customer.city)} (${escapeHtml(customer.province)})<br>
      📧 ${escapeHtml(customer.email)} · 📞 ${escapeHtml(customer.phone)}</p>
    ${customer.notes ? `<p><em>Notas: ${escapeHtml(customer.notes)}</em></p>` : ""}
    <h2>Productos a estampar</h2>
    <table cellpadding="6" style="border-collapse:collapse;width:100%">
      <thead><tr><th style="text-align:left">Producto</th><th>Cant.</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p>Subtotal: ${formatPrice(order.subtotalCents)} · Envío: ${order.shippingCents === 0 ? "Gratis" : formatPrice(order.shippingCents)}</p>
    <p style="font-size:1.2em"><strong>Total: ${formatPrice(order.totalCents)}</strong></p>`;
}

/** Nunca lanza — un fallo de envío no debe enmascarar que el pedido ya quedó confirmado. */
export async function notifyOrderPaid(order: PaidOrder): Promise<void> {
  try {
    const attachments = order.items.flatMap((item, index) =>
      item.customization.image
        ? [{ filename: imageFilename(order.reference, index, item.customization.image), content: item.customization.image.split(",")[1] ?? "" }]
        : [],
    );
    await getClient().emails.send({
      from: getSecret("ORDER_NOTIFY_EMAIL_FROM") ?? "",
      to: getSecret("ORDER_NOTIFY_EMAIL_TO") ?? "",
      replyTo: order.customer.email,
      subject: `Nuevo pedido pagado · ${order.reference} · ${formatPrice(order.totalCents)}`,
      html: renderOrderEmailHtml(order),
      attachments,
    });
  } catch (error) {
    console.error("notifyOrderPaid failed", { ref: order.reference, error });
  }
}

export interface OpsAlertPayload {
  readonly ref: string;
  readonly error: string;
  readonly attempt?: number;
}

/** Nunca lanza — un fallo de alerta no debe enmascarar el error original de settleCheckout. */
export async function notifyOpsAlert(payload: OpsAlertPayload): Promise<void> {
  try {
    await getClient().emails.send({
      from: getSecret("ORDER_NOTIFY_EMAIL_FROM") ?? "",
      to: getSecret("ORDER_NOTIFY_EMAIL_TO") ?? "",
      subject: `[ALERTA] Pago sin confirmar — ref ${payload.ref}`,
      html: `<p>Pago confirmado en SumUp pero no se pudo registrar el pedido.</p>
        <p>Ref: <strong>${escapeHtml(payload.ref)}</strong></p>
        <p>Error: ${escapeHtml(payload.error)}</p>
        ${payload.attempt ? `<p>Intento: ${payload.attempt}</p>` : ""}`,
    });
  } catch (error) {
    console.error("notifyOpsAlert failed", { ref: payload.ref, error });
  }
}
