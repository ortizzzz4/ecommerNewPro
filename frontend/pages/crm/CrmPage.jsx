import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PlusIcon } from '@heroicons/react/24/outline';
import { actualizarOportunidad, getOportunidades, getResumenCrm } from '../../api/ApisCrud';
import { formatPrice } from '../../utils/format';
import { toList } from '../../utils/data';
import { cardClass } from '../../utils/ui';

// Etapas en el mismo orden que el backend (crm/models.py)
const ETAPAS = [
  { codigo: 'nueva', titulo: 'Nuevas' },
  { codigo: 'contactada', titulo: 'Contactadas' },
  { codigo: 'propuesta', titulo: 'Propuesta enviada' },
  { codigo: 'ganada', titulo: 'Ganadas' },
  { codigo: 'perdida', titulo: 'Perdidas' },
];

// Pipeline de ventas: oportunidades agrupadas por etapa, con su valor
export function CrmPage() {
  const [oportunidades, setOportunidades] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = () => {
    Promise.all([getOportunidades(), getResumenCrm()])
      .then(([lista, res]) => {
        setOportunidades(toList(lista.data));
        setResumen(res.data);
      })
      .catch(() => toast.error('No se pudo cargar el CRM'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const cambiarEtapa = async (oportunidad, etapa) => {
    try {
      await actualizarOportunidad(oportunidad.id, { etapa });
      cargar();
    } catch {
      toast.error('No se pudo cambiar la etapa');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Pipeline de ventas</h1>
          {resumen && (
            <p className="text-slate-500 dark:text-slate-400">
              Valor abierto: <span className="font-semibold text-slate-900 dark:text-white">{formatPrice(resumen.valor_abierto)}</span>
            </p>
          )}
        </div>
        <Link to="/erp/crm/nueva" className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-indigo-700">
          <PlusIcon className="h-5 w-5" /> Nueva oportunidad
        </Link>
      </header>

      {cargando ? (
        <p className="animate-pulse py-20 text-center text-slate-500 dark:text-slate-400">Cargando...</p>
      ) : (
        <div className="grid gap-4 overflow-x-auto pb-2 md:grid-cols-5">
          {ETAPAS.map(etapa => {
            const columna = oportunidades.filter(o => o.etapa === etapa.codigo);
            const total = columna.reduce((suma, o) => suma + Number(o.valor), 0);
            return (
              <section key={etapa.codigo} className="min-w-[220px] space-y-3 rounded-2xl bg-slate-200/60 p-3 dark:bg-slate-900">
                <div className="flex items-baseline justify-between px-1">
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{etapa.titulo} ({columna.length})</h2>
                  <span className="text-xs text-slate-500">{formatPrice(total)}</span>
                </div>
                {columna.map(oportunidad => (
                  <article key={oportunidad.id} className={`${cardClass} space-y-2 p-4`}>
                    <Link to={`/erp/crm/${oportunidad.id}`} className="font-semibold text-slate-900 hover:underline dark:text-white">
                      {oportunidad.titulo}
                    </Link>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{oportunidad.cliente || 'Sin cliente'}</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatPrice(oportunidad.valor)}</p>
                    <select
                      value={oportunidad.etapa} onChange={e => cambiarEtapa(oportunidad, e.target.value)}
                      aria-label={`Etapa de ${oportunidad.titulo}`}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {ETAPAS.map(e => <option key={e.codigo} value={e.codigo}>{e.titulo}</option>)}
                    </select>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
