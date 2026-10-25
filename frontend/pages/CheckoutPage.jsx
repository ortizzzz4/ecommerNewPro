import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  addTiendaPago,
  createTiendaPedido,
  getTiendaConfig,
  getTiendaPagos,
  pagarTiendaPedido,
} from '../api/ApisCrud';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/format';
import { loadStripe } from '../utils/stripe';
import { cardClass, primaryButtonClass } from '../utils/ui';

// Formulario para registrar una tarjeta nueva con Stripe Elements
function AddCardForm({ publicKey, onSaved, onCancel }) {
  const mountRef = useRef(null);
  const stripeRef = useRef(null);
  const cardRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    loadStripe(publicKey)
      .then(stripe => {
        if (cancelled) return;
        const card = stripe.elements().create('card');
        card.mount(mountRef.current);
        stripeRef.current = stripe;
        cardRef.current = card;
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el formulario de pago.');
      });

    return () => {
      cancelled = true;
      cardRef.current?.destroy();
      cardRef.current = null;
    };
  }, [publicKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cardRef.current) return;

    setSaving(true);
    setError('');
    try {
      const { token, error: stripeError } = await stripeRef.current.createToken(cardRef.current);
      if (stripeError) {
        setError(stripeError.message);
        return;
      }
      const { data: profile } = await addTiendaPago(token.id);
      toast.success('Tarjeta guardada');
      onSaved(profile);
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo guardar la tarjeta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div ref={mountRef} className="rounded-lg border border-slate-300 bg-white px-3 py-3 dark:border-slate-700" />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Cancelar
        </button>
        <button type="submit" disabled={saving} className={`flex-1 ${primaryButtonClass}`}>
          {saving ? 'Guardando...' : 'Guardar tarjeta'}
        </button>
      </div>
    </form>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, totals, refreshCart } = useCart();
  const [profiles, setProfiles] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const loadProfiles = useCallback(async () => {
    const { data } = await getTiendaPagos();
    setProfiles(data);
    setSelectedId(current => {
      if (data.some(p => p.id === current)) return current;
      return (data.find(p => p.default) || data[0])?.id ?? null;
    });
  }, []);

  useEffect(() => {
    loadProfiles().catch(() => setProfiles([]));
    getTiendaConfig()
      .then(res => setPublicKey(res.data.stripe_public_key))
      .catch(() => setError('No se pudo cargar el sistema de pagos.'));
  }, [loadProfiles]);

  const handleCardSaved = async (profile) => {
    setShowAddCard(false);
    await loadProfiles();
    setSelectedId(profile.id);
  };

  const handlePay = async () => {
    setPaying(true);
    setError('');
    try {
      const { data: pedido } = await createTiendaPedido();
      await pagarTiendaPedido(pedido.id, selectedId);
      await refreshCart();
      toast.success('¡Compra completada! Gracias por tu pedido.');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo completar el pago. Intenta de nuevo.');
    } finally {
      setPaying(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">No hay nada que pagar</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Tu carrito está vacío.</p>
        <Link to="/productos" className="mt-6 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700">
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Finalizar compra</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className={`${cardClass} p-6 lg:col-span-2`}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Método de pago</h2>

          {profiles === null ? (
            <p className="mt-4 animate-pulse text-slate-500 dark:text-slate-400">Cargando tarjetas...</p>
          ) : profiles.length === 0 && !showAddCard ? (
            <p className="mt-4 text-slate-500 dark:text-slate-400">Aún no tienes tarjetas guardadas.</p>
          ) : null}

          {profiles?.length > 0 && (
            <div className="mt-4 space-y-3">
              {profiles.map(profile => (
                <label
                  key={profile.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                    selectedId === profile.id
                      ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="metodo-pago"
                      checked={selectedId === profile.id}
                      onChange={() => setSelectedId(profile.id)}
                      className="accent-indigo-600"
                    />
                    <span className="font-medium capitalize text-slate-900 dark:text-white">
                      {profile.brand} •••• {profile.last4}
                    </span>
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {String(profile.exp_month).padStart(2, '0')}/{profile.exp_year}
                  </span>
                </label>
              ))}
            </div>
          )}

          {showAddCard ? (
            publicKey ? (
              <AddCardForm publicKey={publicKey} onSaved={handleCardSaved} onCancel={() => setShowAddCard(false)} />
            ) : (
              <p className="mt-4 text-slate-500 dark:text-slate-400">Cargando formulario de pago...</p>
            )
          ) : (
            <button
              onClick={() => setShowAddCard(true)}
              disabled={!publicKey}
              className="mt-6 text-sm font-semibold text-indigo-600 hover:underline disabled:opacity-50 dark:text-indigo-400"
            >
              + Agregar tarjeta
            </button>
          )}
        </section>

        <aside className={`${cardClass} h-fit p-6 lg:sticky lg:top-24`}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Resumen</h2>

          <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {cartItems.map(item => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="truncate">{item.quantity} × {item.title}</span>
                <span>{formatPrice(Number(item.price) * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatPrice(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Cargo de servicio</dt>
              <dd>{formatPrice(totals.total - totals.subtotal)}</dd>
            </div>
          </dl>
          <div className="mt-3 flex justify-between text-lg font-bold text-slate-900 dark:text-white">
            <span>Total</span>
            <span>{formatPrice(totals.total)}</span>
          </div>

          {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            onClick={handlePay}
            disabled={paying || !selectedId}
            className={`mt-6 ${primaryButtonClass}`}
          >
            {paying ? 'Procesando pago...' : `Pagar ${formatPrice(totals.total)}`}
          </button>
          {!selectedId && profiles && (
            <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">Agrega una tarjeta para pagar.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
