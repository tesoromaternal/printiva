import { useEffect, useMemo, useState } from "react";

import type { Category, Product } from "../types";
import ProductCard from "./ProductCard";

// "Camisetas" debe encontrar "camiseta"; "tazá" debe encontrar "taza".
const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Búsqueda en cliente: el sitio es estático y el catálogo es chico. */
export default function SearchResults({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
  }, []);

  const results = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean).map((t) => t.replace(/s$/, ""));
    if (terms.length === 0) return products;
    return products.filter((product) => {
      const category = categories.find((c) => c.slug === product.categorySlug)?.name ?? "";
      const haystack = normalize([product.name, product.summary, category, ...product.occasions].join(" "));
      return terms.every((term) => haystack.includes(term));
    });
  }, [query, products, categories]);

  return (
    <div>
      <label className="mb-8 block max-w-xl">
        <span className="sr-only">Buscar</span>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            const url = new URL(window.location.href);
            url.searchParams.set("q", event.target.value);
            window.history.replaceState(null, "", url);
          }}
          placeholder="Busca un producto, una idea, un diseño…"
          className="w-full rounded-full border border-line px-5 py-3 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
        />
      </label>
      <p className="mb-6 text-sm font-semibold text-ink-soft" aria-live="polite">
        {results.length} {results.length === 1 ? "resultado" : "resultados"}
        {query.trim() && <> para “{query.trim()}”</>}
      </p>
      {results.length === 0 ? (
        <div className="rounded-3xl bg-cloud p-10 text-center">
          <p className="text-lg font-extrabold">No encontramos nada… ¡todavía!</p>
          <p className="mt-1 text-sm text-ink-soft">Si lo imaginas, seguramente lo podemos estampar. Cuéntanos tu idea.</p>
          <a href="/contacto" className="btn-brand mt-6 text-sm">Escríbenos</a>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {results.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
