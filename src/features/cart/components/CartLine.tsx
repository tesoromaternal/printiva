import { Minus, Plus, Trash2 } from "lucide-react";

import { formatPrice } from "../../../lib/money";
import ProductMockup from "../../catalog/components/ProductMockup";
import { removeFromCart, setQuantity, type CartItem } from "../store";

export default function CartLine({ item, compact = false }: { item: CartItem; compact?: boolean }) {
  const { customization } = item;
  const details = [item.color.name, item.size, customization.text && `“${customization.text}”`, customization.image && "Con imagen"]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex gap-3 py-4">
      <div className="size-20 shrink-0 rounded-xl bg-cloud p-1">
        <ProductMockup
          kind={item.kind}
          color={item.color.hex}
          image={customization.image}
          text={customization.text}
          textFont={customization.textFont}
          textColor={customization.textColor}
          imageScale={customization.imageScale}
          imageOffset={customization.imageOffset}
          className="h-full w-full"
          title={item.name}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <a href={`/producto/${item.slug}`} className="font-bold hover:text-brand">{item.name}</a>
          <span className="font-extrabold whitespace-nowrap">{formatPrice(item.priceCents * item.quantity)}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-soft">{details}</p>
        {!compact && (
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center rounded-full border border-line">
              <button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)} className="grid size-8 place-items-center rounded-full hover:bg-cloud" aria-label="Quitar uno">
                <Minus className="size-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
              <button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)} className="grid size-8 place-items-center rounded-full hover:bg-cloud" aria-label="Añadir uno">
                <Plus className="size-3.5" />
              </button>
            </div>
            <button type="button" onClick={() => removeFromCart(item.id)} className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-brand-soft hover:text-brand" aria-label={`Eliminar ${item.name}`}>
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
        {compact && <p className="mt-1 text-xs font-semibold text-ink-soft">Cantidad: {item.quantity}</p>}
      </div>
    </li>
  );
}
