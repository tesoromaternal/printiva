import { useStore } from "@nanostores/react";
import { ShoppingCart } from "lucide-react";

import { useMounted } from "../../../lib/useMounted";
import { $cartCount, $cartOpen } from "../store";

export default function CartButton() {
  const stored = useStore($cartCount);
  const count = useMounted() ? stored : 0;

  return (
    <button
      type="button"
      onClick={() => $cartOpen.set(true)}
      className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-xs font-semibold hover:bg-cloud"
      aria-label={`Abrir carrito, ${count} productos`}
    >
      <span className="relative">
        <ShoppingCart className="size-6" aria-hidden="true" />
        <span className="absolute -top-2 -right-2.5 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[0.65rem] leading-5 font-extrabold text-white">
          {count}
        </span>
      </span>
      <span className="hidden sm:block">Carrito</span>
    </button>
  );
}
