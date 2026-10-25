import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { contabilizarFacturas, getFacturas } from '../../api/ApisCrud';
import { formatPrice } from '../../utils/format';
import { sumTotal, toList } from '../../utils/data';
import { cardClass, invoiceStatusLabels, statusBadgeClass } from '../../utils/ui';
import {
  Balanza, BalanceGeneral, EstadoResultados, FiltroPeriodo, LibroDiario, LibroMayor, periodoInicial,
} from './contabilidad/Reportes';
import { PlanDeCuentas } from './contabilidad/PlanDeCuentas';

function SummaryCard({ label, value, hint }) {
  return (
    <div className={`${cardClass} p-5`}>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

// Resumen calculado a partir de las facturas emitidas
function Resumen({ onContabilizado }) {
  const [facturas, setFacturas] = useState(null);
  const [error, setError] = useState(false);
  const [contabilizando, setContabilizando] = useState(false);

  const cargar = () => {
    getFacturas()
      .then(res => setFacturas(toList(res.data)))
      .catch(() => setError(true));
  };

  useEffect(cargar, []);

  const contabilizar = async () => {
    setContabilizando(true);
    try {
      const { data } = await contabilizarFacturas();
      toast.success(`Ventas registradas: ${data.ventas} · Cobros: ${data.cobros} · Anuladas: ${data.anuladas}`);
      onContabilizado();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudieron contabilizar las facturas');
    } finally {
      setContabilizando(false);
    }
  };

  if (error) {
    return <p className="py-20 text-center text-slate-500 dark:text-slate-400">No se pudo cargar la información contable.</p>;
  }

  if (!facturas) {
    return <p className="animate-pulse py-20 text-center text-slate-500 dark:text-slate-400">Cargando resumen...</p>;
  }

  const activas = facturas.filter(f => f.status !== 'anulada');
  const cobradas = facturas.filter(f => f.status === 'pagada');
  const porCobrar = facturas.filter(f => f.status === 'pendiente' || f.status === 'vencida');
  const ivaGenerado = activas.reduce((sum, f) => sum + Number(f.impuesto_monto || 0), 0);
  const recientes = [...facturas]
    .sort((a, b) => new Date(b.fecha_emision) - new Date(a.fecha_emision))
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-slate-500 dark:text-slate-400">Resumen calculado a partir de las facturas emitidas.</p>
        <button
          onClick={contabilizar} disabled={contabilizando}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {contabilizando ? 'Contabilizando...' : 'Contabilizar facturas'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total facturado" value={formatPrice(sumTotal(activas))} hint={`${activas.length} facturas activas`} />
        <SummaryCard label="Cobrado" value={formatPrice(sumTotal(cobradas))} hint={`${cobradas.length} facturas pagadas`} />
        <SummaryCard label="Por cobrar" value={formatPrice(sumTotal(porCobrar))} hint={`${porCobrar.length} pendientes o vencidas`} />
        <SummaryCard label="IVA generado" value={formatPrice(ivaGenerado)} hint="Sobre facturas activas" />
      </div>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">Movimientos recientes</h2>
        </div>

        {recientes.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">Aún no hay movimientos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3">Factura</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recientes.map(factura => (
                  <tr key={factura.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-white">{factura.numero}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{factura.nombre_cliente || '—'}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{factura.fecha_emision}</td>
                    <td className="px-6 py-4">
                      <span className={statusBadgeClass(factura.status)}>{invoiceStatusLabels[factura.status] || factura.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-white">{formatPrice(factura.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// Pestañas: cada reporte carga sus datos con el periodo elegido
const PESTANAS = [
  { id: 'resumen', titulo: 'Resumen' },
  { id: 'plan', titulo: 'Plan de cuentas' },
  { id: 'diario', titulo: 'Libro diario', periodo: true },
  { id: 'mayor', titulo: 'Libro mayor', periodo: true },
  { id: 'balanza', titulo: 'Balanza de comprobación', periodo: true },
  { id: 'balance', titulo: 'Balance general', periodo: 'hasta' },
  { id: 'resultados', titulo: 'Estado de resultados', periodo: true },
];

export function ContabilidadPage() {
  const [pestana, setPestana] = useState('resumen');
  const [periodo, setPeriodo] = useState(periodoInicial);
  const [version, setVersion] = useState(0); // sube al cambiar asientos para recargar los reportes
  const actual = PESTANAS.find(p => p.id === pestana);
  const refrescar = () => setVersion(v => v + 1);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Contabilidad</h1>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800" aria-label="Reportes contables">
        {PESTANAS.map(p => (
          <button
            key={p.id} onClick={() => setPestana(p.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              pestana === p.id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {p.titulo}
          </button>
        ))}
      </nav>

      {actual?.periodo && (
        <FiltroPeriodo
          desde={periodo.desde} hasta={periodo.hasta} soloHasta={actual.periodo === 'hasta'}
          onChange={setPeriodo}
        />
      )}

      <div key={`${pestana}-${version}`}>
        {pestana === 'resumen' && <Resumen onContabilizado={refrescar} />}
        {pestana === 'plan' && <PlanDeCuentas />}
        {pestana === 'diario' && <LibroDiario periodo={periodo} />}
        {pestana === 'mayor' && <LibroMayor periodo={periodo} />}
        {pestana === 'balanza' && <Balanza periodo={periodo} />}
        {pestana === 'balance' && <BalanceGeneral periodo={periodo} />}
        {pestana === 'resultados' && <EstadoResultados periodo={periodo} />}
      </div>
    </div>
  );
}
