import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getPagosEmpresa, getPlanes, pagarConStripe, pagarConTransferencia } from '../../api/ApisCrud';
import { usePermisos } from '../../context/PermisosContext';
import { formatPrice } from '../../utils/format';
import { toList } from '../../utils/data';
import { cardClass, primaryButtonClass } from '../../utils/ui';

const fecha = (valor) => (valor ? new Date(valor).toLocaleDateString('es-SV') : '—');

// Plan y pagos de la empresa: pagar con tarjeta (Stripe) o por transferencia
export function SuscripcionPage() {
  const { miEmpresa } = usePermisos();
  const [planes, setPlanes] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [transferencia, setTransferencia] = useState(null); // {pago, datos_bancarios, instruccion}
  const [procesando, setProcesando] = useState(null);

  const cargar = () => {
    getPlanes().then(({ data }) => setPlanes(toList(data))).catch(() => toast.error('No se pudieron cargar los planes'));
    getPagosEmpresa().then(({ data }) => setPagos(toList(data))).catch(() => {});
  };

  useEffect(() => {
    cargar();
    // Stripe vuelve aquí con ?pago=ok o ?pago=cancelado
    const estado = new URLSearchParams(window.location.search).get('pago');
    if (estado === 'ok') toast.success('Pago recibido. Tu suscripción se activa en unos segundos.');
    if (estado === 'cancelado') toast.info('Pago cancelado. Puedes intentarlo de nuevo.');
  }, []);

  const pagarConTarjeta = async (plan) => {
    setProcesando(`stripe-${plan.id}`);
    try {
      const { data } = await pagarConStripe(plan.id);
      window.location.href = data.url;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo iniciar el pago.');
      setProcesando(null);
    }
  };

  const elegirTransferencia = async (plan) => {
    setProcesando(`transfer-${plan.id}`);
    try {
      const { data } = await pagarConTransferencia(plan.id);
      setTransferencia(data);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo registrar la transferencia.');
    } finally {
      setProcesando(null);
    }
  };

  const activa = miEmpresa?.suscripcion_activa;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Suscripción</h1>
        <p className="text-slate-500 dark:text-slate-400">
          {activa
            ? `Tu plan${miEmpresa.plan ? ` ${miEmpresa.plan}` : ''} está activo hasta el ${fecha(miEmpresa.suscripcion_hasta)}.`
            : `Tu prueba termina el ${fecha(miEmpresa?.trial_hasta)}. Elige un plan para seguir registrando movimientos.`}
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {planes.map(plan => (
          <article key={plan.id} className={`${cardClass} flex flex-col gap-4 p-6`}>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{plan.nombre}</h2>
              {plan.descripcion && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{plan.descripcion}</p>}
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {formatPrice(plan.precio)} <span className="text-sm font-normal text-slate-500">/ {plan.dias} días</span>
            </p>
            <div className="mt-auto space-y-2">
              <button
                onClick={() => pagarConTarjeta(plan)} disabled={procesando !== null}
                className={primaryButtonClass}
              >
                {procesando === `stripe-${plan.id}` ? 'Abriendo pago...' : 'Pagar con tarjeta'}
              </button>
              <button
                onClick={() => elegirTransferencia(plan)} disabled={procesando !== null}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Pagar por transferencia
              </button>
            </div>
          </article>
        ))}
      </section>

      {planes.length === 0 && (
        <p className={`${cardClass} p-8 text-center text-slate-500 dark:text-slate-400`}>No hay planes disponibles por ahora.</p>
      )}

      {transferencia && (
        <section className={`${cardClass} space-y-3 p-6`}>
          <h2 className="font-semibold text-slate-900 dark:text-white">Datos para la transferencia</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Banco</dt><dd className="font-medium text-slate-900 dark:text-white">{transferencia.datos_bancarios.banco}</dd></div>
            <div><dt className="text-slate-500">Cuenta</dt><dd className="font-medium text-slate-900 dark:text-white">{transferencia.datos_bancarios.cuenta}</dd></div>
            <div><dt className="text-slate-500">Titular</dt><dd className="font-medium text-slate-900 dark:text-white">{transferencia.datos_bancarios.titular}</dd></div>
            <div><dt className="text-slate-500">Monto</dt><dd className="font-medium text-slate-900 dark:text-white">{formatPrice(transferencia.pago.monto)}</dd></div>
          </dl>
          <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">{transferencia.instruccion}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cuando veamos la transferencia en el banco, activamos tu plan. Puede tardar un día hábil.
          </p>
        </section>
      )}

      {pagos.length > 0 && (
        <section className={`${cardClass} overflow-x-auto`}>
          <h2 className="px-6 pt-5 font-semibold text-slate-900 dark:text-white">Historial de pagos</h2>
          <table className="mt-3 min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Método</th>
                <th className="px-6 py-3 text-right">Monto</th>
                <th className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagos.map(pago => (
                <tr key={pago.id} className="text-slate-700 dark:text-slate-300">
                  <td className="px-6 py-3">{fecha(pago.creado)}</td>
                  <td className="px-6 py-3">{pago.plan}</td>
                  <td className="px-6 py-3">{pago.metodo}</td>
                  <td className="px-6 py-3 text-right">{formatPrice(pago.monto)}</td>
                  <td className="px-6 py-3">{pago.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
