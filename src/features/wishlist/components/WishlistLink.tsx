import { useStore } from "@nanostores/react";
import { Heart } from "lucide-react";

import { useMounted } from "../../../lib/useMounted";
import { $wishlistCount } from "../store";

export default function WishlistLink() {
  const stored = useStore($wishlistCount);
  const count = useMounted() ? stored : 0;

  return (
    <a href="/favoritos" className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-xs font-semibold hover:bg-cloud" aria-label={`Favoritos, ${count}`}>
      <span className="relative">
        <Heart className="size-6" aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -top-2 -right-2.5 grid min-w-5 place-items-center rounded-full bg-ink px-1 text-[0.65rem] leading-5 font-extrabold text-white">
            {count}
          </span>
        )}
      </span>
      <span className="hidden sm:block">Favoritos</span>
    </a>
  );
}
