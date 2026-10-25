import { Fragment, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  actualizarEmpresaAdmin, crearEmpresaPrueba, eliminarEmpresaAdmin, extenderPruebaAdmin, getEmpresaAdmin,
  getEmpresasAdmin, getModulosCatalogo, confirmarPagoAdmin,
} from '../../api/ApisCrud';
import { formatPrice } from '../../utils/format';
import { toList } from '../../utils/data';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../utils/ui';

const ESTADOS = {
  prueba: { etiqueta: 'En prueba', clase: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  activa: { etiqueta: 'Activa', clase: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  vencida: { etiqueta: 'Sin pago', clase: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  bloqueada: { etiqueta: 'Bloqueada', clase: 'bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-200' },
};

// Empresas agrupadas por base de datos: varias empresas de una misma cuenta comparten base
const porBase = (lista) => lista.reduce((grupos, empresa) => {
  (grupos[empresa.db_name] ||= []).push(empresa);
  return grupos;
}, {});

const fecha = (valor) => (valor ? new Date(valor).toLocaleDateString('es-SV') : '—');

function Estado({ estado }) {
  const info = ESTADOS[estado] || ESTADOS.vencida;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${info.clase}`}>{info.etiqueta}</span>;
}

// Alta de una empresa de pruebas: no vence, trae datos de demostración y todos los módulos
function NuevaEmpresaPrueba({ onCreada }) {
  const vacio = { nombre: '', slug: '', correo: '', usuario: '', password: '' };
  const [datos, setDatos] = useState(vacio);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo, valor) => setDatos(prev => ({ ...prev, [campo]: valor }));

  const crear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const { data } = await crearEmpresaPrueba(datos);
      toast.success(`Empresa de pruebas creada: ${data.nombre}`);
      setDatos(vacio);
      onCreada();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo crear la empresa de pruebas');
    } finally {
      setGuardando(false);
    }
  };

  const campos = [
    ['nombre', 'Nombre'],
    ['slug', 'Identificador (para iniciar sesión)'],
    ['correo', 'Correo', 'email'],
    ['usuario', 'Usuario administrador'],
    ['password', 'Contraseña (mín. 8)', 'password'],
  ];

  return (
    <form onSubmit={crear} className={`${cardClass} grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5`}>
      {campos.map(([campo, etiqueta, tipo]) => (
        <div key={campo}>
          <label htmlFor={`prueba-${campo}`} className={labelClass}>{etiqueta}</label>
          <input
            id={`prueba-${campo}`} type={tipo || 'text'} required value={datos[campo]}
            onChange={e => cambiar(campo, e.target.value)} className={inputClass}
          />
        </div>
      ))}
      <p className="text-sm text-slate-500 dark:text-slate-400 sm:col-span-2 lg:col-span-5">
        Las empresas de pruebas no vencen y se pueden eliminar cuando quieras, junto con todos sus datos.
      </p>
      <div className="sm:col-span-2 lg:col-span-5">
        <button type="submit" disabled={guardando} className={`${primaryButtonClass} sm:w-auto sm:px-6`}>
          {guardando ? 'Creando...' : 'Crear empresa de pruebas'}
        </button>
      </div>
    </form>
  );
}

// Módulos de una empresa, editables por la plataforma
function ModulosEmpresa({ empresa, onGuardado }) {
  const [catalogo, setCatalogo] = useState([]);
  const [elegidos, setElegidos] = useState(empresa.modulos);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getModulosCatalogo().then(({ data }) => setCatalogo(data)).catch(() => toast.error('No se pudo cargar el catálogo'));
  }, []);

  const alternar = (id) => setElegidos(prev => (prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]));

  const guardar = async () => {
    setGuardando(true);
    try {
      const { data } = await actualizarEmpresaAdmin(empresa.id, { modulos: elegidos });
      toast.success('Módulos actualizados');
      onGuardado(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudieron guardar los módulos');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {catalogo.map(modulo => (
          <label key={modulo.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox" checked={elegidos.includes(modulo.id)} disabled={modulo.base}
              onChange={() => alternar(modulo.id)} className="h-4 w-4 accent-indigo-600"
            />
            {modulo.titulo}{modulo.base ? ' (base)' : ''}
          </label>
        ))}
      </div>
      <button onClick={guardar} disabled={guardando} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
        {guardando ? 'Guardando...' : 'Guardar módulos'}
      </button>
    </div>
  );
}

// Pagos de la empresa y confirmación de transferencias
function PagosEmpresa({ pagos, onConfirmado }) {
  const confirmar = async (pago) => {
    try {
      await confirmarPagoAdmin(pago.id);
      toast.success('Pago confirmado. Suscripción activada.');
      onConfirmado();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo confirmar el pago');
    }
  };

  if (!pagos?.length) return <p className="text-sm text-slate-500 dark:text-slate-400">Sin pagos registrados.</p>;

  return (
    <table className="min-w-full text-sm">
      <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <tr><th className="py-2">Fecha</th><th>Plan</th><th>Método</th><th className="text-right">Monto</th><th>Estado</th><th /></tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {pagos.map(pago => (
          <tr key={pago.id} className="text-slate-700 dark:text-slate-300">
            <td className="py-2">{fecha(pago.creado)}</td>
            <td>{pago.plan}</td>
            <td>{pago.metodo}</td>
            <td className="text-right">{formatPrice(pago.monto)}</td>
            <td>{pago.estado}</td>
            <td className="text-right">
              {pago.estado_codigo === 'pendiente' && (
                <button onClick={() => confirmar(pago)} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Confirmar</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EmpresasAdminPage() {
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [abierta, setAbierta] = useState(null); // id de la empresa con detalle abierto
  const [detalle, setDetalle] = useState(null);
  const [mostrarPrueba, setMostrarPrueba] = useState(false);

  const cargar = () => {
    setCargando(true);
    getEmpresasAdmin({ estado: estado || undefined, q: busqueda || undefined })
      .then(({ data }) => setEmpresas(toList(data)))
      .catch(() => toast.error('No se pudieron cargar las empresas'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    const espera = setTimeout(cargar, 250); // espera a que el usuario termine de escribir
    return () => clearTimeout(espera);
  }, [estado, busqueda]);

  const abrirDetalle = async (empresa) => {
    if (abierta === empresa.id) {
      setAbierta(null);
      return;
    }
    setAbierta(empresa.id);
    try {
      const { data } = await getEmpresaAdmin(empresa.id);
      setDetalle(data);
    } catch {
      toast.error('No se pudo cargar el detalle');
    }
  };

  const bloquear = async (empresa) => {
    const accion = empresa.bloqueada ? 'desbloquear' : 'bloquear';
    if (!window.confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} a ${empresa.nombre}?`)) return;
    try {
      await actualizarEmpresaAdmin(empresa.id, { bloqueada: !empresa.bloqueada });
      toast.success(`Empresa ${empresa.bloqueada ? 'desbloqueada' : 'bloqueada'}`);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo cambiar el bloqueo');
    }
  };

  const prorrogar = async (empresa) => {
    const dias = Number(window.prompt(`¿Cuántos días de prórroga para ${empresa.nombre}?`, '15'));
    if (!dias) return;
    try {
      await extenderPruebaAdmin(empresa.id, dias);
      toast.success(`Prórroga de ${dias} días aplicada`);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo aplicar la prórroga');
    }
  };

  const eliminar = async (empresa) => {
    if (!window.confirm(`¿Eliminar la empresa de pruebas ${empresa.nombre}? Se borran todos sus datos y no se puede deshacer.`)) return;
    try {
      await eliminarEmpresaAdmin(empresa.id);
      toast.success('Empresa de pruebas eliminada');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo eliminar la empresa');
    }
  };

  const refrescarDetalle = async (empresaId) => {
    const { data } = await getEmpresaAdmin(empresaId);
    setDetalle(data);
    cargar();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Empresas</h1>
          <p className="text-slate-500 dark:text-slate-400">{Object.keys(porBase(empresas)).length} cliente(s) (bases de datos) · {empresas.length} empresa(s). Bloqueo, prórroga y pagos son por cliente.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setMostrarPrueba(v => !v)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            {mostrarPrueba ? 'Cerrar' : 'Nueva empresa de pruebas'}
          </button>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar nombre, identificador o correo" className={`${inputClass} mt-0 w-64`} />
          <select value={estado} onChange={e => setEstado(e.target.value)} className={`${inputClass} mt-0 w-40`} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="prueba">En prueba</option>
            <option value="activa">Activas</option>
            <option value="vencida">Sin pago</option>
            <option value="bloqueada">Bloqueadas</option>
          </select>
        </div>
      </header>

      {mostrarPrueba && <NuevaEmpresaPrueba onCreada={cargar} />}

      <section className={`${cardClass} overflow-x-auto`}>
        {cargando ? (
          <p className="animate-pulse p-8 text-center text-slate-500 dark:text-slate-400">Cargando...</p>
        ) : empresas.length === 0 ? (
          <p className="p-8 text-center text-slate-500 dark:text-slate-400">No hay empresas con ese filtro.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Empresa</th>
                <th className="px-5 py-3">Correo</th>
                <th className="px-5 py-3">Base de datos</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Vence</th>
                <th className="px-5 py-3">Pagos pendientes</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {Object.entries(porBase(empresas)).map(([db, items]) => (
                <Fragment key={db}>
                  <tr className="bg-slate-100 dark:bg-slate-800/70">
                    <td colSpan={7} className="px-5 py-2 text-xs text-slate-600 dark:text-slate-300">
                      Cliente <span className="font-semibold">{items.find(e => e.titular)?.correo || items[0].correo}</span>
                      {' · '}base <span className="font-mono font-semibold">{db}</span>
                      {' · '}{items.length} empresa(s): {items.map(e => e.nombre).join(', ')}
                    </td>
                  </tr>
                  {items.map(empresa => (
                    <FilaEmpresa
                      key={empresa.id}
                      empresa={empresa}
                      abierta={abierta === empresa.id}
                      detalle={abierta === empresa.id ? detalle : null}
                      onVer={() => abrirDetalle(empresa)}
                      onBloquear={() => bloquear(empresa)}
                      onProrrogar={() => prorrogar(empresa)}
                      onEliminar={() => eliminar(empresa)}
                      onCambio={() => refrescarDetalle(empresa.id)}
                      onGuardadoModulos={(datos) => { setDetalle(prev => ({ ...prev, ...datos })); cargar(); }}
                    />
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function FilaEmpresa({ empresa, abierta, detalle, onVer, onBloquear, onProrrogar, onEliminar, onCambio, onGuardadoModulos }) {
  const vence = empresa.suscripcion_hasta || empresa.trial_hasta;
  return (
    <>
      <tr className="text-slate-700 dark:text-slate-300">
        <td className="px-5 py-3">
          <p className="font-semibold text-slate-900 dark:text-white">
            {empresa.nombre}
            {empresa.es_prueba && <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Pruebas</span>}
          </p>
          <p className="text-xs text-slate-500">{empresa.slug}{empresa.plan ? ` · ${empresa.plan}` : ''}</p>
        </td>
        <td className="px-5 py-3">{empresa.correo}</td>
        <td className="px-5 py-3 font-mono text-xs">{empresa.db_name}</td>
        <td className="px-5 py-3"><Estado estado={empresa.estado} /></td>
        <td className="px-5 py-3">
          {fecha(vence)}
          <p className="text-xs text-slate-500">{empresa.dias_restantes} días</p>
        </td>
        <td className="px-5 py-3">{empresa.pagos_pendientes || '—'}</td>
        <td className="space-x-3 px-5 py-3 text-right whitespace-nowrap">
          <button onClick={onVer} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">{abierta ? 'Cerrar' : 'Ver'}</button>
          {empresa.titular && (
            <>
              <button onClick={onProrrogar} className="font-semibold text-slate-600 hover:underline dark:text-slate-300">Prórroga</button>
              <button onClick={onBloquear} className={`font-semibold hover:underline ${empresa.bloqueada ? 'text-emerald-600' : 'text-red-600'}`}>
                {empresa.bloqueada ? 'Desbloquear cliente' : 'Bloquear cliente'}
              </button>
            </>
          )}
          {empresa.es_prueba && (
            <button onClick={onEliminar} className="font-semibold text-red-600 hover:underline">Eliminar</button>
          )}
        </td>
      </tr>
      {abierta && (
        <tr className="bg-slate-50 dark:bg-slate-800/40">
          <td colSpan={7} className="space-y-6 px-5 py-5">
            {!detalle ? (
              <p className="animate-pulse text-slate-500">Cargando detalle...</p>
            ) : (
              <>
                <dl className="grid gap-3 text-sm sm:grid-cols-4">
                  <div><dt className="text-slate-500">Creada</dt><dd className="font-medium text-slate-900 dark:text-white">{fecha(detalle.creada)}</dd></div>
                  <div><dt className="text-slate-500">Fin de prueba</dt><dd className="font-medium text-slate-900 dark:text-white">{fecha(detalle.trial_hasta)}</dd></div>
                  <div><dt className="text-slate-500">Suscripción hasta</dt><dd className="font-medium text-slate-900 dark:text-white">{fecha(detalle.suscripcion_hasta)}</dd></div>
                  <div><dt className="text-slate-500">Último pago</dt><dd className="font-medium text-slate-900 dark:text-white">{detalle.ultimo_pago ? `${detalle.ultimo_pago.estado} · ${detalle.ultimo_pago.metodo}` : '—'}</dd></div>
                </dl>
                <div>
                  <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Módulos contratados</h3>
                  <ModulosEmpresa key={detalle.id} empresa={detalle} onGuardado={onGuardadoModulos} />
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Pagos</h3>
                  <PagosEmpresa pagos={detalle.pagos} onConfirmado={onCambio} />
                </div>
              </>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
