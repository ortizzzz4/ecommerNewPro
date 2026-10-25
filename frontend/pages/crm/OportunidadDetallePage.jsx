import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { actualizarOportunidad, crearActividad, getActividades, getOportunidad } from '../../api/ApisCrud';
import { formatPrice } from '../../utils/format';
import { toList } from '../../utils/data';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../utils/ui';

const ETAPAS = [
  { codigo: 'nueva', titulo: 'Nueva' },
  { codigo: 'contactada', titulo: 'Contactada' },
  { codigo: 'propuesta', titulo: 'Propuesta enviada' },
  { codigo: 'ganada', titulo: 'Ganada' },
  { codigo: 'perdida', titulo: 'Perdida' },
];
const TIPOS = [
  { codigo: 'llamada', titulo: 'Llamada' },
  { codigo: 'reunion', titulo: 'Reunión' },
  { codigo: 'correo', titulo: 'Correo' },
  { codigo: 'nota', titulo: 'Nota' },
];

// Ficha de una oportunidad: datos, etapa y el historial de actividades
export function OportunidadDetallePage() {
  const { id } = useParams();
  const [oportunidad, setOportunidad] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [nueva, setNueva] = useState({ tipo: 'llamada', descripcion: '' });
  const [noEncontrada, setNoEncontrada] = useState(false);

  const cargar = () => {
    getOportunidad(id)
      .then(({ data }) => setOportunidad(data))
      .catch(() => setNoEncontrada(true));
    getActividades(id).then(({ data }) => setActividades(toList(data))).catch(() => {});
  };

  useEffect(cargar, [id]);

  if (noEncontrada) return <p className="py-20 text-center text-slate-500">No se encontró la oportunidad.</p>;
  if (!oportunidad) return <p className="animate-pulse py-20 text-center text-slate-500 dark:text-slate-400">Cargando...</p>;

  const cambiarEtapa = async (etapa) => {
    try {
      const { data } = await actualizarOportunidad(id, { etapa });
      setOportunidad(data);
      toast.success('Etapa actualizada');
    } catch {
      toast.error('No se pudo cambiar la etapa');
    }
  };

  const registrar = async (e) => {
    e.preventDefault();
    try {
      await crearActividad({ oportunidad: Number(id), ...nueva });
      setNueva({ tipo: 'llamada', descripcion: '' });
      cargar();
    } catch {
      toast.error('No se pudo registrar la actividad');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/erp/crm" className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">← Pipeline</Link>

      <section className={`${cardClass} space-y-4 p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{oportunidad.titulo}</h1>
            <p className="text-slate-500 dark:text-slate-400">{oportunidad.cliente || 'Sin cliente'}{oportunidad.responsable_nombre ? ` · responsable ${oportunidad.responsable_nombre}` : ''}</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatPrice(oportunidad.valor)}</p>
        </div>
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <label htmlFor="etapa" className={labelClass}>Etapa</label>
            <select id="etapa" value={oportunidad.etapa} onChange={e => cambiarEtapa(e.target.value)} className={inputClass}>
              {ETAPAS.map(e => <option key={e.codigo} value={e.codigo}>{e.titulo}</option>)}
            </select>
          </div>
          <div><p className="text-slate-500">Correo</p><p className="font-medium text-slate-900 dark:text-white">{oportunidad.correo || '—'}</p></div>
          <div><p className="text-slate-500">Teléfono</p><p className="font-medium text-slate-900 dark:text-white">{oportunidad.telefono || '—'}</p></div>
        </div>
        {oportunidad.notas && <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{oportunidad.notas}</p>}
      </section>

      <section className={`${cardClass} space-y-5 p-6`}>
        <h2 className="font-semibold text-slate-900 dark:text-white">Actividades</h2>
        <form onSubmit={registrar} className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="tipo" className={labelClass}>Tipo</label>
            <select id="tipo" value={nueva.tipo} onChange={e => setNueva(p => ({ ...p, tipo: e.target.value }))} className={inputClass}>
              {TIPOS.map(t => <option key={t.codigo} value={t.codigo}>{t.titulo}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="descripcion" className={labelClass}>Qué pasó</label>
            <input id="descripcion" required value={nueva.descripcion} onChange={e => setNueva(p => ({ ...p, descripcion: e.target.value }))} className={inputClass} />
          </div>
          <button type="submit" className={`${primaryButtonClass} w-auto px-5`}>Registrar</button>
        </form>

        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {actividades.length === 0 && <li className="py-3 text-sm text-slate-500">Aún no hay actividades.</li>}
          {actividades.map(a => (
            <li key={a.id} className="py-3 text-sm">
              <p className="text-slate-900 dark:text-white">
                <span className="font-semibold">{a.tipo}</span> · {a.descripcion}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(a.fecha).toLocaleString('es-SV')}{a.usuario_nombre ? ` · ${a.usuario_nombre}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
