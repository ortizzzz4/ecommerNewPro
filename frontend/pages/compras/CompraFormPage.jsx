import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TrashIcon } from '@heroicons/react/24/outline';
import { crearCompra, getProducts, getProveedores } from '../../api/ApisCrud';
import { formatPrice } from '../../utils/format';
import { toList } from '../../utils/data';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../utils/ui';

const LINEA_VACIA = { producto_id: '', cantidad: '', costo_unitario: '' };

// Nueva orden de compra: proveedor, productos a comprar y costo de cada uno
export function CompraFormPage() {
  const navigate = useNavigate();
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedorId, setProveedorId] = useState('');
  const [notas, setNotas] = useState('');
  const [lineas, setLineas] = useState([]);
  const [linea, setLinea] = useState(LINEA_VACIA);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getProveedores().then(({ data }) => setProveedores(toList(data))).catch(() => toast.error('No se pudieron cargar los proveedores'));
    // Solo los bienes tienen existencias; los servicios no se reciben
    getProducts({ canal: 'compras' })
      .then(({ data }) => setProductos(toList(data).filter(p => p.tipo === 'bien')))
      .catch(() => toast.error('No se pudieron cargar los productos'));
  }, []);

  const productoPorId = (id) => productos.find(p => String(p.id) === String(id));
  const totalOrden = lineas.reduce((suma, l) => suma + Number(l.cantidad) * Number(l.costo_unitario || 0), 0);

  const agregarLinea = () => {
    const producto = productoPorId(linea.producto_id);
    if (!producto) return toast.error('Elige un producto');
    if (!(Number(linea.cantidad) > 0)) return toast.error('La cantidad debe ser mayor que cero');
    if (Number(linea.costo_unitario || 0) < 0) return toast.error('El costo no puede ser negativo');
    setLineas(prev => [...prev, { ...linea, titulo: producto.title }]);
    setLinea(LINEA_VACIA);
  };

  const quitarLinea = (indice) => setLineas(prev => prev.filter((_, i) => i !== indice));

  const guardar = async (e) => {
    e.preventDefault();
    if (lineas.length === 0) return toast.error('Agrega al menos un producto');
    setGuardando(true);
    try {
      const { data } = await crearCompra({
        proveedor_id: Number(proveedorId),
        notas,
        lineas: lineas.map(l => ({
          producto_id: Number(l.producto_id),
          cantidad: l.cantidad,
          costo_unitario: l.costo_unitario || 0,
        })),
      });
      toast.success('Orden creada. Confirma la recepción cuando llegue la mercadería.');
      navigate(`/erp/compras/recepciones/${data.recepcion_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo crear la orden de compra');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Nueva orden de compra</h1>
        <p className="text-slate-500 dark:text-slate-400">Al guardar se crea la recepción pendiente de esta orden.</p>
      </header>

      <section className={`${cardClass} grid gap-4 p-5 sm:grid-cols-2`}>
        <div>
          <label htmlFor="proveedor" className={labelClass}>Proveedor</label>
          <select id="proveedor" required value={proveedorId} onChange={e => setProveedorId(e.target.value)} className={inputClass}>
            <option value="">Elige un proveedor</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="notas" className={labelClass}>Notas (opcional)</label>
          <input id="notas" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej. Pedido de mayo" className={inputClass} />
        </div>
      </section>

      <section className={`${cardClass} space-y-4 p-5`}>
        <h2 className="font-semibold text-slate-900 dark:text-white">Productos</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_120px_140px_auto] sm:items-end">
          <div>
            <label htmlFor="linea-producto" className={labelClass}>Producto</label>
            <select id="linea-producto" value={linea.producto_id} onChange={e => setLinea(p => ({ ...p, producto_id: e.target.value }))} className={inputClass}>
              <option value="">Elige un producto</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="linea-cantidad" className={labelClass}>Cantidad</label>
            <input id="linea-cantidad" type="number" min="0" step="any" value={linea.cantidad} onChange={e => setLinea(p => ({ ...p, cantidad: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label htmlFor="linea-costo" className={labelClass}>Costo unitario (USD)</label>
            <input id="linea-costo" type="number" min="0" step="0.01" value={linea.costo_unitario} onChange={e => setLinea(p => ({ ...p, costo_unitario: e.target.value }))} className={inputClass} />
          </div>
          <button type="button" onClick={agregarLinea} className="rounded-lg border border-indigo-600 px-4 py-2 font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950">
            Agregar
          </button>
        </div>

        {lineas.length > 0 && (
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2">Producto</th>
                <th className="py-2 text-right">Cantidad</th>
                <th className="py-2 text-right">Costo</th>
                <th className="py-2 text-right">Subtotal</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lineas.map((l, i) => (
                <tr key={i} className="text-slate-700 dark:text-slate-300">
                  <td className="py-2">{l.titulo}</td>
                  <td className="py-2 text-right">{l.cantidad}</td>
                  <td className="py-2 text-right">{formatPrice(l.costo_unitario || 0)}</td>
                  <td className="py-2 text-right font-semibold">{formatPrice(Number(l.cantidad) * Number(l.costo_unitario || 0))}</td>
                  <td className="py-2 text-right">
                    <button type="button" onClick={() => quitarLinea(i)} aria-label={`Quitar ${l.titulo}`} className="text-red-600 hover:text-red-700 dark:text-red-400">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-lg font-bold text-slate-900 dark:text-white">Total: {formatPrice(totalOrden)}</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/erp/compras/ordenes')} className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
            Cancelar
          </button>
          <button type="submit" disabled={guardando || lineas.length === 0 || !proveedorId} className={`${primaryButtonClass} w-auto px-5`}>
            {guardando ? 'Guardando...' : 'Crear orden'}
          </button>
        </div>
      </div>
    </form>
  );
}
