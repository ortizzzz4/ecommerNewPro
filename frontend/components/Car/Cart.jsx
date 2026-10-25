import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCartIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../utils/format';
import { primaryButtonClass } from '../../utils/ui';

export function Cart() {
  const navigate = useNavigate();
  const { cartItems, totals, loading, removeFromCart, updateQuantity, clearCart } = useCart();
  const isLoggedIn = Boolean(localStorage.getItem('access_token'));

  const handleCheckout = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    navigate('/checkout');
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <ShoppingCartIcon className="h-16 w-16 text-slate-300 dark:text-slate-700" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Tu carrito está vacío</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Agrega productos para continuar con tu compra.</p>
        <Link to="/productos" className="mt-6 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700">
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Carrito</h1>
        <button onClick={clearCart} disabled={loading} className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400">
          Vaciar carrito
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <ul className="space-y-4 lg:col-span-2">
          {cartItems.map(item => (
            <li
              key={item.id}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {item.image && (
                <img src={item.image} alt={item.title} className="h-24 w-24 flex-shrink-0 rounded-lg object-cover" />
              )}

              <div className="flex flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">{item.title}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{formatPrice(item.price)} c/u</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={loading}
                      aria-label="Disminuir cantidad"
                      className="px-3 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={loading}
                      aria-label="Aumentar cantidad"
                      className="px-3 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      +
                    </button>
                  </div>

                  <span className="w-24 text-right font-bold text-slate-900 dark:text-white">
                    {formatPrice(Number(item.price) * item.quantity)}
                  </span>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    disabled={loading}
                    aria-label={`Quitar ${item.title} del carrito`}
                    className="text-slate-400 transition hover:text-red-600 dark:hover:text-red-400"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Resumen del pedido</h2>

          <dl className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatPrice(totals.subtotal)}</dd>
            </div>
            {totals.total > totals.subtotal && (
              <div className="flex justify-between">
                <dt>Cargo de servicio</dt>
                <dd>{formatPrice(totals.total - totals.subtotal)}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-lg font-bold text-slate-900 dark:border-slate-800 dark:text-white">
            <span>Total</span>
            <span>{formatPrice(totals.total)}</span>
          </div>

          <button onClick={handleCheckout} disabled={loading} className={`mt-6 ${primaryButtonClass}`}>
            Proceder al pago
          </button>

          {!isLoggedIn && (
            <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
              Necesitas iniciar sesión para pagar.
            </p>
          )}

          <Link to="/productos" className="mt-4 block text-center text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            Seguir comprando
          </Link>
        </aside>
      </div>
    </div>
  );
}
