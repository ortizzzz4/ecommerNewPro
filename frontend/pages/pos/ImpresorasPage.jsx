import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  abrirCajon,
  deletePosImpresora,
  getPosImpresoras,
  pruebaPosImpresora,
  savePosImpresora,
} from '../../api/ApisCrud';
import { usePermisos } from '../../context/PermisosContext';
import { toList } from '../../utils/data';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../utils/ui';

const VACIA = {
  nombre: '', conexion: 'red', host: '', puerto: 9100, destino: '',
  ancho_papel: 80, codepage: 'cp858', predeterminada: false, activa: true,
};

const CONEXIONES = [
  { value: 'red', label: 'Red (IP y puerto, normalmente 9100)' },
  { value: 'windows', label: 'Windows (nombre de la impresora instalada)' },
  { value: 'dispositivo', label: 'Dispositivo (COM3 o /dev/usb/lp0)' },
];

const CODEPAGES = [
  { value: 'cp858', label: 'CP858 (incluye €, recomendado)' },
  { value: 'cp850', label: 'CP850 (europeo)' },
  { value: 'cp437', label: 'CP437 (original de IBM)' },
  { value: 'cp1252', label: 'Windows-1252' },
];

export function ImpresorasPage() {
  const { can } = usePermisos();
  const puedeEditar = can('pos.add_printerprofile') || can('pos.change_printerprofile');
  const [impresoras, setImpresoras] = useState(null);
  const [form, setForm] = useState(null); // null = cerrado; {id?, ...campos}
  const [guardando, setGuardando] = useState(false);

  const cargar = () => getPosImpresoras().then(res => setImpresoras(toList(res.data)));

  useEffect(() => {
    cargar().catch(() => setImpresoras([]));
  }, []);

  const campo = (nombre, valor) => setForm(prev => ({ ...prev, [nombre]: valor }));

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const { id, ...datos } = form;
      await savePosImpresora(id, datos);
      toast.success('Impresora guardada');
      setForm(null);
      await cargar();
    } catch (err) {
      const errores = err.response?.data;
      toast.error(errores ? Object.values(errores).flat().join(' ') : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (impresora) => {
    if (!window.confirm(`¿Eliminar la impresora "${impresora.nombre}"?`)) return;
    try {
      await deletePosImpresora(impresora.id);
      toast.success('Impresora eliminada');
      await cargar();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const probar = async (impresora) => {
    try {
      const { data } = await pruebaPosImpresora(impresora.id);
      toast.success(data.detail);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'La prueba falló');
    }
  };

  const abrir = async (impresora) => {
    try {
      await abrirCajon(impresora.id);
      toast.success('Cajón abierto');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo abrir el cajón');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/erp/pos" className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">← Volver al punto de venta</Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Impresoras térmicas</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Las impresoras deben estar conectadas al equipo donde corre el servidor de Django (o en la misma red).
          </p>
        </div>
        {puedeEditar && !form && (
          <button onClick={() => setForm({ ...VACIA })} className={`${primaryButtonClass} w-auto px-5`}>
            Nueva impresora
          </button>
        )}
      </header>

      {form && (
        <form onSubmit={guardar} className={`${cardClass} grid gap-4 p-6 md:grid-cols-2`}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white md:col-span-2">
            {form.id ? 'Editar impresora' : 'Nueva impresora'}
          </h2>

          <div>
            <label htmlFor="nombre" className={labelClass}>Nombre</label>
            <input id="nombre" required value={form.nombre} onChange={e => campo('nombre', e.target.value)} className={inputClass} placeholder="Caja 1" />
          </div>

          <div>
            <label htmlFor="conexion" className={labelClass}>Tipo de conexión</label>
            <select id="conexion" value={form.conexion} onChange={e => campo('conexion', e.target.value)} className={inputClass}>
              {CONEXIONES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {form.conexion === 'red' ? (
            <>
              <div>
                <label htmlFor="host" className={labelClass}>Dirección IP</label>
                <input id="host" required value={form.host} onChange={e => campo('host', e.target.value)} className={inputClass} placeholder="192.168.1.50" />
              </div>
              <div>
                <label htmlFor="puerto" className={labelClass}>Puerto</label>
                <input id="puerto" type="number" value={form.puerto} onChange={e => campo('puerto', e.target.value)} className={inputClass} />
              </div>
            </>
          ) : (
            <div className="md:col-span-2">
              <label htmlFor="destino" className={labelClass}>
                {form.conexion === 'windows' ? 'Nombre de la impresora en Windows' : 'Ruta del dispositivo'}
              </label>
              <input
                id="destino" required value={form.destino}
                onChange={e => campo('destino', e.target.value)}
                className={inputClass}
                placeholder={form.conexion === 'windows' ? 'XP-80C' : 'COM3 o /dev/usb/lp0'}
              />
            </div>
          )}

          <div>
            <label htmlFor="ancho" className={labelClass}>Ancho del papel</label>
            <select id="ancho" value={form.ancho_papel} onChange={e => campo('ancho_papel', Number(e.target.value))} className={inputClass}>
              <option value={80}>80 mm</option>
              <option value={58}>58 mm</option>
            </select>
          </div>

          <div>
            <label htmlFor="codepage" className={labelClass}>Tabla de caracteres</label>
            <select id="codepage" value={form.codepage} onChange={e => campo('codepage', e.target.value)} className={inputClass}>
              {CODEPAGES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap gap-6 md:col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={form.predeterminada} onChange={e => campo('predeterminada', e.target.checked)} className="accent-indigo-600" />
              Predeterminada
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={form.activa} onChange={e => campo('activa', e.target.checked)} className="accent-indigo-600" />
              Activa
            </label>
          </div>

          <div className="flex gap-3 md:col-span-2">
            <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className={`${primaryButtonClass} w-auto px-6`}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      <div className={`${cardClass} overflow-hidden`}>
        {impresoras === null ? (
          <p className="animate-pulse px-6 py-12 text-center text-slate-500">Cargando impresoras...</p>
        ) : impresoras.length === 0 ? (
          <p className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Aún no hay impresoras configuradas.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {impresoras.map(impresora => (
              <li key={impresora.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {impresora.nombre}
                    {impresora.predeterminada && <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">Predeterminada</span>}
                    {!impresora.activa && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">Inactiva</span>}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {impresora.ancho_papel} mm · {impresora.conexion === 'red' ? `${impresora.host}:${impresora.puerto}` : impresora.destino} · {impresora.codepage}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => probar(impresora)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">Probar</button>
                  <button onClick={() => abrir(impresora)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">Abrir cajón</button>
                  {puedeEditar && (
                    <>
                      <button onClick={() => setForm({ ...impresora })} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300">Editar</button>
                      <button onClick={() => eliminar(impresora)} className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300">Eliminar</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
