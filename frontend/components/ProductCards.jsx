import { Link } from 'react-router-dom';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/format';

export function ProductCards({ product }) {
  const { addToCart } = useCart();
  const detailPath = `/productos/${product.id}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <Link to={detailPath} className="block aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
        {product.image ? (
          <img
            src={product.image}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Sin imagen</div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link to={detailPath} className="line-clamp-2 font-semibold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">
          {product.title}
        </Link>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500 dark:text-slate-400">{product.description}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-lg font-bold text-slate-900 dark:text-white">{formatPrice(product.price)}</span>
          <button
            onClick={() => addToCart(product)}
            aria-label={`Agregar ${product.title} al carrito`}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <ShoppingCartIcon className="h-4 w-4" />
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}
