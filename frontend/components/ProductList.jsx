import { useEffect, useState } from "react"
import { getProducts } from "../api/ApisCrud";
import { ProductCards } from "./ProductCards";

export function ProductList() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getProducts({ canal: 'tienda' })
      .then(res => setProducts(res.data))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <p className="py-20 text-center text-slate-500 dark:text-slate-400">
        No pudimos cargar el catálogo. Intenta de nuevo más tarde.
      </p>
    );
  }

  if (!products) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className="py-20 text-center text-slate-500 dark:text-slate-400">
        No hay productos disponibles por ahora.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {products.map(product => (
        <ProductCards key={product.id} product={product} />
      ))}
    </div>
  )
}
