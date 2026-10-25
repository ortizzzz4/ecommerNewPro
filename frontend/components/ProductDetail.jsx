import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getCurrentUser, getProduct } from "../api/ApisCrud";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../utils/format";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      getCurrentUser()
        .then(res => {
          setIsStaff(Boolean(res.data.is_staff));
          localStorage.setItem('isStaff', res.data.is_staff);
        })
        .catch(() => setIsStaff(false));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    // Solo se muestran productos con "Tienda en línea" activo
    getProduct(id, { canal: 'tienda' })
      .then(res => setProduct(res.data))
      .catch(() => {
        setProduct(null);
        toast.error("No se pudo cargar el producto");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="py-20 text-center text-slate-500 animate-pulse">Cargando producto...</div>;
  }

  if (!product) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-slate-600 dark:text-slate-300">Producto no encontrado.</p>
        <Link to="/productos" className="mt-4 inline-block font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/productos" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
        ← Volver al catálogo
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {product.image ? (
            <img src={product.image} alt={product.title} className="aspect-square w-full object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center text-slate-400">Sin imagen</div>
          )}
        </div>

        <div className="flex flex-col">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">{product.title}</h1>
          <p className="mt-4 text-3xl font-bold text-indigo-600 dark:text-indigo-400">{formatPrice(product.price)}</p>
          <p className="mt-6 leading-relaxed text-slate-600 dark:text-slate-300">{product.description}</p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                aria-label="Disminuir cantidad"
                className="px-4 py-2 text-lg transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                −
              </button>
              <span className="w-12 text-center font-semibold" aria-live="polite">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                aria-label="Aumentar cantidad"
                className="px-4 py-2 text-lg transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                +
              </button>
            </div>

            <button
              onClick={() => addToCart(product, quantity)}
              className="flex-1 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:flex-none"
            >
              Agregar al carrito
            </button>
          </div>

          {isStaff && (
            <button
              onClick={() => navigate(`/productos/edit/${id}`)}
              className="mt-6 self-start text-sm font-semibold text-amber-600 hover:underline dark:text-amber-400"
            >
              Editar producto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
