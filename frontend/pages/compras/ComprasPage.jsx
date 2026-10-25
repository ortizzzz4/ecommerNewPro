import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PlusIcon } from '@heroicons/react/24/outline';
import { getCompras } from '../../api/ApisCrud';
import { formatPrice } from '../../utils/format';
import { toList } from '../../utils/data';
import { cardClass } from '../../utils/ui';

const ESTADO_ETIQUETA = { pendiente: 'Pendiente', recibida: 'Recibida' };
const ESTADO_COLOR = {
  pendiente: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  recibida: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
};

// Órdenes de compra a proveedores y el estado de su recepción
export function ComprasPage() {
  const [compras, setCompras] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getCompras()
      .then(({ data }) => setCompras(toList(data)))
      .catch(() => toast.error('No se pudieron cargar las órdenes de compra'))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Órdenes de compra</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Cada orden crea una recepción que ingresa la mercadería al inventario al confirmarla.
          </p>
        </div>
        <Link
          to="/erp/compras/ordenes/nueva"
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5" /> Nueva orden
        </Link>
      </header>

      <section className={`${cardClass} overflow-x-auto`}>
        {cargando ? (
          <p className="animate-pulse p-8 text-center text-slate-500 dark:text-slate-400">Cargando...</p>
        ) : compras.length === 0 ? (
          <p className="p-8 text-center text-slate-500 dark:text-slate-400">Aún no hay órdenes de compra.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Orden</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Proveedor</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3">Recepción</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {compras.map(compra => (
                <tr key={compra.id} className="text-slate-700 dark:text-slate-300">
                  <td className="px-5 py-3 font-medium">#{compra.id}</td>
                  <td className="px-5 py-3">{new Date(compra.creado).toLocaleDateString('es-SV')}</td>
                  <td className="px-5 py-3">{compra.proveedor_nombre}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatPrice(compra.total)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_COLOR[compra.estado_recepcion]}`}>
                      {ESTADO_ETIQUETA[compra.estado_recepcion] || compra.estado_recepcion}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/erp/compras/recepciones/${compra.recepcion_id}`} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                      Ver recepción
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
