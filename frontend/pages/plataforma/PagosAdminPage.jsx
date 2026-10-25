import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { confirmarPagoAdmin, getPagosAdmin } from '../../api/ApisCrud';
import { formatPrice } from '../../utils/format';
import { toList } from '../../utils/data';
import { cardClass, inputClass } from '../../utils/ui';

const fecha = (valor) => (valor ? new Date(valor).toLocaleString('es-SV') : '—');

// Pagos de todas las empresas. Por defecto las transferencias pendientes, para confirmarlas al recibirlas
export function PagosAdminPage() {
  const [pagos, setPagos] = useState([]);
  const [estado, setEstado] = useState('pendiente');
  const [cargando, setCargando] = useState(true);

  const cargar = () => {
    setCargando(true);
    getPagosAdmin(estado)
      .then(({ data }) => setPagos(toList(data)))
      .catch(() => toast.error('No se pudieron cargar los pagos'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, [estado]);

  const confirmar = async (pago) => {
    if (!window.confirm(`¿Confirmas el pago de ${pago.empresa_nombre} por ${formatPrice(pago.monto)}?`)) return;
    try {
      await confirmarPagoAdmin(pago.id);
      toast.success('Pago confirmado. Suscripción activada.');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo confirmar el pago');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Pagos</h1>
          <p className="text-slate-500 dark:text-slate-400">Confirma las transferencias cuando lleguen al banco.</p>
        </div>
        <select value={estado} onChange={e => setEstado(e.target.value)} className={`${inputClass} mt-0 w-48`} aria-label="Filtrar pagos">
          <option value="pendiente">Pendientes</option>
          <option value="pagado">Pagados</option>
          <option value="todos">Todos</option>
        </select>
      </header>

      <section className={`${cardClass} overflow-x-auto`}>
        {cargando ? (
          <p className="animate-pulse p-8 text-center text-slate-500 dark:text-slate-400">Cargando...</p>
        ) : pagos.length === 0 ? (
          <p className="p-8 text-center text-slate-500 dark:text-slate-400">No hay pagos con ese filtro.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Empresa</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Método</th>
                <th className="px-5 py-3 text-right">Monto</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagos.map(pago => (
                <tr key={pago.id} className="text-slate-700 dark:text-slate-300">
                  <td className="px-5 py-3">{fecha(pago.creado)}</td>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-900 dark:text-white">{pago.empresa_nombre}</p>
                    <p className="text-xs text-slate-500">{pago.empresa}</p>
                  </td>
                  <td className="px-5 py-3">{pago.plan}</td>
                  <td className="px-5 py-3">{pago.metodo}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatPrice(pago.monto)}</td>
                  <td className="px-5 py-3">{pago.estado}</td>
                  <td className="px-5 py-3 text-right">
                    {pago.estado_codigo === 'pendiente' && (
                      <button onClick={() => confirmar(pago)} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Confirmar</button>
                    )}
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
