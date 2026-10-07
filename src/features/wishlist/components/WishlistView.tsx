import { useStore } from "@nanostores/react";
import { Heart } from "lucide-react";

import ProductCard from "../../catalog/components/ProductCard";
import type { Product } from "../../catalog/types";
import { $wishlist } from "../store";

export default function WishlistView({ products }: { products: Product[] }) {
  const slugs = useStore($wishlist);
  const favorites = products.filter((product) => slugs.includes(product.slug));

  if (favorites.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-cloud p-10 text-center">
        <Heart className="mx-auto size-12 text-brand" />
        <p className="mt-4 text-lg font-extrabold">Aún no tienes favoritos</p>
        <p className="mt-1 text-sm text-ink-soft">Pulsa el corazón de cualquier producto para guardarlo aquí.</p>
        <a href="/tienda" className="btn-brand mt-6 text-sm">Explorar la tienda</a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {favorites.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}
