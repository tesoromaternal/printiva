import { useStore } from "@nanostores/react";
import { Heart } from "lucide-react";

import { useMounted } from "../../../lib/useMounted";
import { $wishlist, toggleWishlist } from "../store";

export default function WishlistButton({ slug, name, className = "" }: { slug: string; name: string; className?: string }) {
  const list = useStore($wishlist);
  const active = useMounted() && list.includes(slug);

  return (
    <button
      type="button"
      onClick={() => toggleWishlist(slug)}
      aria-pressed={active}
      aria-label={active ? `Quitar ${name} de favoritos` : `Añadir ${name} a favoritos`}
      className={`grid size-9 place-items-center rounded-full bg-white/90 shadow-sm transition hover:scale-110 ${className}`}
    >
      <Heart className={`size-[1.15rem] transition ${active ? "fill-brand text-brand" : "text-ink"}`} />
    </button>
  );
}
