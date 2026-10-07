import { persistentAtom } from "@nanostores/persistent";
import { computed } from "nanostores";

export const $wishlist = persistentAtom<string[]>("printiva:wishlist", [], {
  encode: JSON.stringify,
  decode: (raw) => {
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  },
});

export const $wishlistCount = computed($wishlist, (slugs) => slugs.length);

export const toggleWishlist = (slug: string): void => {
  const current = $wishlist.get();
  $wishlist.set(current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]);
};
