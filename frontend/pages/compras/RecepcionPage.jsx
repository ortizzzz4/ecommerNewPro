import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { confirmarRecepcion, getRecepcion } from '../../api/ApisCrud';
import { usePermisos } from '../../context/PermisosContext';
import { cardClass, inputClass, primaryButtonClass } from '../../utils/ui';

// Recepción de una orden: se cuenta lo que llegó y al confirmar entra al inventario
export function RecepcionPage() {
  const { id } = useParams();
  const { can } = usePermisos();
  const [recepcion, setRecepcion] = useState(null);
  const [cantidades, setCantidades] = useState({});
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    getRecepcion(id)
      .then(({ data }) => {
        setRecepcion(data);
        // Por defecto se asume que llegó todo lo pedido; el usuario corrige si hace falta
        setCantidades(Object.fromEntries(data.lineas.map(l => [l.id, l.cantidad_esperada])));
      })
      .catch(() => toast.error('No se pudo cargar la recepción'));
  }, [id]);

  if (!recepcion) return <p className="animate-pulse py-20 text-center text-slate-500 dark:text-slate-400">Cargando...</p>;

  const pendiente = recepcion.estado === 'pendiente';
  const puedeConfirmar = pendiente && can('inventario.change_recepcion');

  const confirmar = async () => {
    if (!window.confirm('Se sumarán las existencias recibidas al inventario. ¿Confirmar la recepción?')) return;
    setConfirmando(true);
    try {
      const { data } = await confirmarRecepcion(
        id,
        recepcion.lineas.map(l => ({ id: l.id, cantidad_recibida: cantidades[l.id] || 0 })),
      );
      setRecepcion(data);
      toast.success('Recepción confirmada. Inventario actualizado.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo confirmar la recepción');
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Recepción de compra #{recepcion.compra_id}</h1>
          <p className="text-slate-500 dark:text-slate-400">Proveedor: {recepcion.proveedor_nombre}</p>
        </div>
        <Link to="/erp/compras/ordenes" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          ← Órdenes de compra
        </Link>
      </header>

      <section className={`${cardClass} space-y-4 p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${pendiente
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
            {pendiente ? 'Pendiente de recibir' : 'Recibida'}
          </span>
          {!pendiente && recepcion.recibida_en && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Confirmada el {new Date(recepcion.recibida_en).toLocaleString('es-SV')}
              {recepcion.recibida_por ? ` por ${recepcion.recibida_por}` : ''}
            </p>
          )}
        </div>

        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="py-2">Producto</th>
              <th className="py-2 text-right">Esperado</th>
              <th className="py-2 text-right">Recibido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {recepcion.lineas.map(linea => (
              <tr key={linea.id} className="text-slate-700 dark:text-slate-300">
                <td className="py-3">{linea.producto_nombre}</td>
                <td className="py-3 text-right">{linea.cantidad_esperada}</td>
                <td className="py-3 text-right">
                  {puedeConfirmar ? (
                    <input
                      type="number" min="0" step="any" aria-label={`Cantidad recibida de ${linea.producto_nombre}`}
                      value={cantidades[linea.id] ?? ''}
                      onChange={e => setCantidades(prev => ({ ...prev, [linea.id]: e.target.value }))}
                      className={`${inputClass} mt-0 ml-auto w-28 py-1.5 text-right`}
                    />
                  ) : (
                    linea.cantidad_recibida ?? '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {puedeConfirmar && (
          <button onClick={confirmar} disabled={confirmando} className={`${primaryButtonClass} w-auto px-6`}>
            {confirmando ? 'Confirmando...' : 'Confirmar recepción'}
          </button>
        )}
        {pendiente && !can('inventario.change_recepcion') && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Tu rol no puede confirmar recepciones.</p>
        )}
      </section>
    </div>
  );
}
