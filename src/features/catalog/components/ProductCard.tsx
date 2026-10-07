import { ShoppingCart } from "lucide-react";

import { formatPrice } from "../../../lib/money";
import WishlistButton from "../../wishlist/components/WishlistButton";
import type { Product } from "../types";
import ProductMockup from "./ProductMockup";

/** Única tarjeta de producto: la usan tanto las páginas Astro como las islas (favoritos, búsqueda). */
export default function ProductCard({ product }: { product: Product }) {
  const href = `/producto/${product.slug}`;
  const [photo, hoverPhoto] = product.images;

  return (
    <article className="group relative flex flex-col">
      <a href={href} className="relative block aspect-square overflow-hidden rounded-2xl bg-cloud" aria-label={product.name}>
        {photo ? (
          <>
            <img
              src={photo.url}
              alt={photo.alt || product.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            {/* Segunda foto al pasar el mouse, si existe. */}
            {hoverPhoto && (
              <img
                src={hoverPhoto.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <ProductMockup
            kind={product.kind}
            color={product.colors[0]?.hex ?? "#FFFFFF"}
            art={product.art}
            title={product.name}
            className="h-full w-full p-3 transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {product.badge && (
          <span className="absolute top-3 left-3 rounded-full bg-brand px-2.5 py-1 text-[0.7rem] font-bold text-white">{product.badge}</span>
        )}
      </a>
      <WishlistButton slug={product.slug} name={product.name} className="absolute top-3 right-3" />

      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="leading-snug font-bold">
          <a href={href} className="hover:text-brand">{product.name}</a>
        </h3>
        <p className="mt-0.5 font-extrabold">{formatPrice(product.priceCents)}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <ul className="flex flex-wrap gap-1.5" aria-label="Colores disponibles">
            {product.colors.slice(0, 6).map((color) => (
              <li key={color.hex} className="size-4 rounded-full border border-ink/15" style={{ background: color.hex }} title={color.name}>
                <span className="sr-only">{color.name}</span>
              </li>
            ))}
          </ul>
          <a
            href={href}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-line transition hover:border-brand hover:bg-brand hover:text-white"
            aria-label={`Personalizar ${product.name}`}
            title="Personalizar"
          >
            <ShoppingCart className="size-[1.1rem]" />
          </a>
        </div>
      </div>
    </article>
  );
}
