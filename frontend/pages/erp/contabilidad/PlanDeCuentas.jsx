import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  anularAsiento, cargarPlanBase, crearAsiento, crearCuenta, getAsientos, getCuentas,
} from '../../../api/ApisCrud';
import { formatPrice } from '../../../utils/format';
import { toList } from '../../../utils/data';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../../utils/ui';

const TIPOS = [
  ['activo', 'Activo'], ['pasivo', 'Pasivo'], ['patrimonio', 'Patrimonio'],
  ['ingreso', 'Ingreso'], ['costo', 'Costo'], ['gasto', 'Gasto'],
];

const hoy = () => new Date().toISOString().slice(0, 10);
const linea = () => ({ cuenta: '', debe: '', haber: '', descripcion: '' });
const aNumero = (valor) => Number(valor) || 0;

function NuevaCuenta({ cuentas, onCreada }) {
  const vacio = { codigo: '', nombre: '', tipo: 'activo', padre: '', acepta_movimientos: true };
  const [datos, setDatos] = useState(vacio);
  const cambiar = (campo, valor) => setDatos(prev => ({ ...prev, [campo]: valor }));

  const guardar = async (e) => {
    e.preventDefault();
    try {
      await crearCuenta({ ...datos, padre: datos.padre || null });
      toast.success('Cuenta creada');
      setDatos(vacio);
      onCreada();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo crear la cuenta');
    }
  };

  return (
    <form onSubmit={guardar} className={`${cardClass} grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5`}>
      <div>
        <label htmlFor="cuenta-codigo" className={labelClass}>Código</label>
        <input id="cuenta-codigo" required value={datos.codigo} onChange={e => cambiar('codigo', e.target.value)} className={inputClass} placeholder="1.1.05" />
      </div>
      <div className="lg:col-span-2">
        <label htmlFor="cuenta-nombre" className={labelClass}>Nombre</label>
        <input id="cuenta-nombre" required value={datos.nombre} onChange={e => cambiar('nombre', e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="cuenta-tipo" className={labelClass}>Tipo</label>
        <select id="cuenta-tipo" value={datos.tipo} onChange={e => cambiar('tipo', e.target.value)} className={inputClass}>
          {TIPOS.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="cuenta-padre" className={labelClass}>Cuenta padre</label>
        <select id="cuenta-padre" value={datos.padre} onChange={e => cambiar('padre', e.target.value)} className={inputClass}>
          <option value="">Ninguna</option>
          {cuentas.filter(c => !c.acepta_movimientos).map(c => <option key={c.id} value={c.id}>{c.codigo} {c.nombre}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 lg:col-span-3">
        <input type="checkbox" checked={datos.acepta_movimientos} onChange={e => cambiar('acepta_movimientos', e.target.checked)} className="h-4 w-4 accent-indigo-600" />
        Recibe movimientos (cuenta de detalle)
      </label>
      <div className="sm:col-span-2 lg:col-span-5">
        <button type="submit" className={`${primaryButtonClass} sm:w-auto sm:px-6`}>Crear cuenta</button>
      </div>
    </form>
  );
}

function NuevoAsiento({ cuentas, onRegistrado }) {
  const detalle = cuentas.filter(c => c.acepta_movimientos);
  const [fecha, setFecha] = useState(hoy());
  const [descripcion, setDescripcion] = useState('');
  const [partidas, setPartidas] = useState([linea(), linea()]);
  const [guardando, setGuardando] = useState(false);

  const totalDebe = partidas.reduce((s, p) => s + aNumero(p.debe), 0);
  const totalHaber = partidas.reduce((s, p) => s + aNumero(p.haber), 0);
  const cuadra = totalDebe > 0 && totalDebe.toFixed(2) === totalHaber.toFixed(2);

  const cambiarLinea = (indice, campo, valor) => setPartidas(prev => prev.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)));
  const quitarLinea = (indice) => setPartidas(prev => prev.filter((_, i) => i !== indice));

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await crearAsiento({
        fecha,
        descripcion,
        partidas: partidas
          .filter(p => p.cuenta)
          .map(p => ({ cuenta: Number(p.cuenta), debe: p.debe || 0, haber: p.haber || 0, descripcion: p.descripcion })),
      });
      toast.success('Asiento registrado');
      setDescripcion('');
      setPartidas([linea(), linea()]);
      onRegistrado();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo registrar el asiento');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className={`${cardClass} space-y-5 p-5`}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="asiento-fecha" className={labelClass}>Fecha</label>
          <input id="asiento-fecha" type="date" required value={fecha} onChange={e => setFecha(e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="asiento-descripcion" className={labelClass}>Descripción</label>
          <input id="asiento-descripcion" required value={descripcion} onChange={e => setDescripcion(e.target.value)} className={inputClass} placeholder="Pago de alquiler de mayo" />
        </div>
      </div>

      <div className="space-y-2">
        {partidas.map((p, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-12">
            <select aria-label={`Cuenta de la línea ${i + 1}`} value={p.cuenta} onChange={e => cambiarLinea(i, 'cuenta', e.target.value)} className={`${inputClass} mt-0 sm:col-span-5`}>
              <option value="">Elige una cuenta</option>
              {detalle.map(c => <option key={c.id} value={c.id}>{c.codigo} {c.nombre}</option>)}
            </select>
            <input aria-label={`Debe de la línea ${i + 1}`} type="number" min="0" step="0.01" placeholder="Debe" value={p.debe} onChange={e => cambiarLinea(i, 'debe', e.target.value)} className={`${inputClass} mt-0 sm:col-span-2`} />
            <input aria-label={`Haber de la línea ${i + 1}`} type="number" min="0" step="0.01" placeholder="Haber" value={p.haber} onChange={e => cambiarLinea(i, 'haber', e.target.value)} className={`${inputClass} mt-0 sm:col-span-2`} />
            <input aria-label={`Detalle de la línea ${i + 1}`} value={p.descripcion} onChange={e => cambiarLinea(i, 'descripcion', e.target.value)} placeholder="Detalle (opcional)" className={`${inputClass} mt-0 sm:col-span-2`} />
            <button type="button" onClick={() => quitarLinea(i)} disabled={partidas.length <= 2} className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-40 sm:col-span-1">Quitar</button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <button type="button" onClick={() => setPartidas(prev => [...prev, linea()])} className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">+ Agregar línea</button>
        <p className={`text-sm font-medium ${cuadra ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
          Debe {formatPrice(totalDebe)} · Haber {formatPrice(totalHaber)} {cuadra ? '✓ cuadra' : '— no cuadra aún'}
        </p>
      </div>

      <button type="submit" disabled={!cuadra || guardando} className={`${primaryButtonClass} sm:w-auto sm:px-6`}>
        {guardando ? 'Registrando...' : 'Registrar asiento'}
      </button>
    </form>
  );
}

function AsientosRecientes({ asientos, onAnulado }) {
  const anular = async (asiento) => {
    if (!window.confirm(`¿Anular el asiento #${asiento.numero}? Dejará de contar en los reportes.`)) return;
    try {
      await anularAsiento(asiento.id);
      toast.success('Asiento anulado');
      onAnulado();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo anular el asiento');
    }
  };

  if (asientos.length === 0) return <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Aún no hay asientos.</p>;

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {asientos.map(a => (
        <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">#{a.numero} · {a.descripcion}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {a.fecha} · {a.origen_display}{a.referencia ? ` · ${a.referencia}` : ''}
              {a.estado === 'anulado' && <span className="ml-2 font-semibold text-red-600">ANULADO</span>}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-900 dark:text-white">{formatPrice(a.total)}</span>
            {a.origen === 'manual' && a.estado === 'contabilizado' && (
              <button onClick={() => anular(a)} className="font-semibold text-red-600 hover:underline">Anular</button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Plan de cuentas, registro de asientos manuales y últimos asientos
export function PlanDeCuentas() {
  const [cuentas, setCuentas] = useState([]);
  const [asientos, setAsientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarCuenta, setMostrarCuenta] = useState(false);

  const cargar = () => {
    Promise.all([getCuentas(), getAsientos()])
      .then(([cuentasRes, asientosRes]) => {
        setCuentas(toList(cuentasRes.data));
        setAsientos(toList(asientosRes.data));
      })
      .catch(() => toast.error('No se pudo cargar el plan de cuentas'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const cargarBase = async () => {
    try {
      const { data } = await cargarPlanBase();
      toast.success(data.creadas ? `Se agregaron ${data.creadas} cuentas base` : 'El plan base ya estaba cargado');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo cargar el plan base');
    }
  };

  if (cargando) return <p className="animate-pulse py-10 text-center text-slate-500 dark:text-slate-400">Cargando...</p>;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Plan de cuentas</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{cuentas.length} cuentas</p>
          </div>
          <div className="flex gap-3">
            <button onClick={cargarBase} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              Cargar plan base
            </button>
            <button onClick={() => setMostrarCuenta(v => !v)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              {mostrarCuenta ? 'Cerrar' : 'Nueva cuenta'}
            </button>
          </div>
        </div>
        {mostrarCuenta && <NuevaCuenta cuentas={cuentas} onCreada={cargar} />}
        <div className={`${cardClass} overflow-x-auto`}>
          {cuentas.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Carga el plan base para empezar.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {cuentas.map(c => (
                <li key={c.id} className={`flex justify-between px-5 py-2 text-sm ${c.acepta_movimientos ? 'text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-white'}`} style={{ paddingLeft: `${1.25 + (c.codigo.split('.').length - 1) * 1.25}rem` }}>
                  <span>{c.codigo} {c.nombre}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{c.tipo_display} · {c.naturaleza}{c.acepta_movimientos ? '' : ' · agrupadora'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-slate-900 dark:text-white">Registrar asiento manual</h2>
        <NuevoAsiento cuentas={cuentas} onRegistrado={cargar} />
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">Asientos recientes</h2>
        </div>
        <AsientosRecientes asientos={asientos} onAnulado={cargar} />
      </section>
    </div>
  );
}
