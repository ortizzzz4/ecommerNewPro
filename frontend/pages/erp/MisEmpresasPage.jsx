import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  cambiarEmpresa, crearEmpresaEnCuenta, getMisEmpresas, getModulosCatalogo,
} from '../../api/ApisCrud';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../utils/ui';
import { UsuariosCuenta } from './accesos/UsuariosCuenta';

// Empresas de la cuenta. Todas viven en la misma base de datos y se crean desde aquí, sin volver a registrarse.
export function MisEmpresasPage() {
  const [empresas, setEmpresas] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [nombre, setNombre] = useState('');
  const [elegidos, setElegidos] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    getMisEmpresas().then(({ data }) => setEmpresas(data)).catch(() => toast.error('No se pudieron cargar tus empresas'));
  };

  useEffect(() => {
    cargar();
    getModulosCatalogo().then(({ data }) => {
      setCatalogo(data.filter(m => !m.base));
      setElegidos(data.filter(m => !m.base).map(m => m.id));
    });
  }, []);

  const alternarModulo = (id) => setElegidos(prev => (prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]));

  // Entra a la empresa indicada cambiando la sesión, sin pedir la contraseña
  const entrarA = async (identificador) => {
    try {
      const { data } = await cambiarEmpresa(identificador);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      window.location.href = '/erp';
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo cambiar de empresa');
    }
  };

  const crear = async (e) => {
    e.preventDefault();
    if (elegidos.length === 0) return toast.error('Elige al menos un módulo.');
    setGuardando(true);
    try {
      const { data } = await crearEmpresaEnCuenta({ nombre, modulos: elegidos });
      toast.success(`Empresa creada: ${data.nombre}`);
      await entrarA(data.empresa);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo crear la empresa');
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Mis empresas</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Todas tus empresas están en tu misma cuenta. Cada una tiene sus propios productos, clientes, facturas y contabilidad.
        </p>
      </header>

      <section className={`${cardClass} overflow-hidden`}>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {empresas.map(empresa => (
            <li key={empresa.empresa} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {empresa.nombre}
                  {empresa.es_prueba && <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Pruebas</span>}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{empresa.empresa}{empresa.bloqueada ? ' · bloqueada' : ''}</p>
              </div>
              {empresa.es_actual ? (
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Estás aquí</span>
              ) : (
                <button
                  onClick={() => entrarA(empresa.empresa)} disabled={empresa.bloqueada}
                  className="text-sm font-semibold text-indigo-600 hover:underline disabled:opacity-40 dark:text-indigo-400"
                >
                  Entrar
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={crear} className={`${cardClass} space-y-6 p-6`}>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Crear otra empresa</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Se crea dentro de tu misma cuenta. Usarás el mismo usuario y contraseña.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="nueva-nombre" className={labelClass}>Nombre de la empresa</label>
            <input id="nueva-nombre" required value={nombre} onChange={e => setNombre(e.target.value)} className={inputClass} />
          </div>
        </div>

        <fieldset>
          <legend className={labelClass}>Módulos</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {catalogo.map(modulo => (
              <label key={modulo.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={elegidos.includes(modulo.id)} onChange={() => alternarModulo(modulo.id)} className="h-4 w-4 accent-indigo-600" />
                {modulo.titulo}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" disabled={guardando} className={`${primaryButtonClass} sm:w-auto sm:px-6`}>
          {guardando ? 'Creando...' : 'Crear empresa y entrar'}
        </button>
      </form>

      <UsuariosCuenta empresas={empresas} />
    </div>
  );
}
