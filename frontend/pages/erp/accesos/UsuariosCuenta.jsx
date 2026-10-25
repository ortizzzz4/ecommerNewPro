import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  actualizarUsuarioCuenta, crearUsuarioCuenta, getUsuariosCuenta,
} from '../../../api/ApisCrud';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../../utils/ui';

export const ROLES_CUENTA = ['Administrador', 'Vendedor', 'Cajero', 'Compras', 'Contador'];

const vacio = { username: '', email: '', nombre: '', password: '' };

// Empresas que el usuario puede usar, con su rol en cada una (vacío = sin acceso)
function EditorAccesos({ empresas, accesos, onChange }) {
  const actual = (slug) => accesos.find(a => a.empresa === slug);

  const alternar = (slug) => {
    if (actual(slug)) onChange(accesos.filter(a => a.empresa !== slug));
    else onChange([...accesos, { empresa: slug, rol: 'Vendedor' }]);
  };

  const cambiarRol = (slug, rol) => onChange(accesos.map(a => (a.empresa === slug ? { ...a, rol } : a)));

  return (
    <ul className="space-y-2">
      {empresas.map(empresa => {
        const acceso = actual(empresa.empresa);
        return (
          <li key={empresa.empresa} className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex min-w-[12rem] items-center gap-2 text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={!!acceso} onChange={() => alternar(empresa.empresa)} className="h-4 w-4 accent-indigo-600" />
              {empresa.nombre}
            </label>
            {acceso && (
              <select
                aria-label={`Rol en ${empresa.nombre}`} value={acceso.rol} onChange={e => cambiarRol(empresa.empresa, e.target.value)}
                className={`${inputClass} mt-0 w-40`}
              >
                {ROLES_CUENTA.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Usuarios de la cuenta: una sola contraseña para todas sus empresas. Solo los ve el administrador.
export function UsuariosCuenta({ empresas }) {
  const [usuarios, setUsuarios] = useState(null);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [nuevo, setNuevo] = useState(vacio);
  const [accesosNuevo, setAccesosNuevo] = useState([]);
  const [editando, setEditando] = useState(null); // { id, accesos }
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    getUsuariosCuenta()
      .then(({ data }) => setUsuarios(data))
      .catch(err => {
        if (err.response?.status === 403) setSinPermiso(true);
        else toast.error('No se pudieron cargar los usuarios');
      });
  };

  useEffect(cargar, []);

  if (sinPermiso) return null;

  const crear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await crearUsuarioCuenta({ ...nuevo, accesos: accesosNuevo });
      toast.success(`Usuario creado: ${nuevo.username}`);
      setNuevo(vacio);
      setAccesosNuevo([]);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo crear el usuario');
    } finally {
      setGuardando(false);
    }
  };

  const guardarEdicion = async () => {
    try {
      await actualizarUsuarioCuenta(editando.id, { accesos: editando.accesos });
      toast.success('Accesos actualizados');
      setEditando(null);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudieron guardar los accesos');
    }
  };

  const alternarActivo = async (usuario) => {
    try {
      await actualizarUsuarioCuenta(usuario.id, { activo: !usuario.activo });
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo cambiar el estado');
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-slate-900 dark:text-white">Usuarios de la cuenta</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cada usuario entra con su propia contraseña a las empresas que le asignes, con el rol que elijas en cada una.
        </p>
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        {!usuarios ? (
          <p className="animate-pulse px-5 py-8 text-center text-sm text-slate-500">Cargando...</p>
        ) : usuarios.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Todavía no hay usuarios.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {usuarios.map(usuario => (
              <li key={usuario.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {usuario.nombre || usuario.username}
                      {!usuario.activo && <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">Desactivado</span>}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{usuario.username} · {usuario.email}</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <button
                      onClick={() => setEditando(editando?.id === usuario.id ? null : { id: usuario.id, accesos: usuario.accesos })}
                      className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      {editando?.id === usuario.id ? 'Cancelar' : 'Editar accesos'}
                    </button>
                    <button onClick={() => alternarActivo(usuario)} className="font-semibold text-slate-600 hover:underline dark:text-slate-300">
                      {usuario.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>

                {editando?.id === usuario.id ? (
                  <div className="space-y-3">
                    <EditorAccesos empresas={empresas} accesos={editando.accesos} onChange={accesos => setEditando({ ...editando, accesos })} />
                    <button onClick={guardarEdicion} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                      Guardar accesos
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {usuario.accesos.length === 0
                      ? 'Sin acceso a ninguna empresa.'
                      : usuario.accesos.map(a => `${a.nombre} (${a.rol})`).join(' · ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={crear} className={`${cardClass} space-y-5 p-6`}>
        <h3 className="font-semibold text-slate-900 dark:text-white">Nuevo usuario</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="usuario-nombre" className={labelClass}>Nombre</label>
            <input id="usuario-nombre" value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label htmlFor="usuario-username" className={labelClass}>Usuario</label>
            <input id="usuario-username" required value={nuevo.username} onChange={e => setNuevo({ ...nuevo, username: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label htmlFor="usuario-email" className={labelClass}>Correo</label>
            <input id="usuario-email" type="email" required value={nuevo.email} onChange={e => setNuevo({ ...nuevo, email: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label htmlFor="usuario-password" className={labelClass}>Contraseña (mín. 8)</label>
            <input id="usuario-password" type="password" required minLength={8} autoComplete="new-password" value={nuevo.password} onChange={e => setNuevo({ ...nuevo, password: e.target.value })} className={inputClass} />
          </div>
        </div>
        <div>
          <p className={labelClass}>Empresas a las que tendrá acceso</p>
          <div className="mt-2">
            <EditorAccesos empresas={empresas} accesos={accesosNuevo} onChange={setAccesosNuevo} />
          </div>
        </div>
        <button type="submit" disabled={guardando} className={`${primaryButtonClass} sm:w-auto sm:px-6`}>
          {guardando ? 'Creando...' : 'Crear usuario'}
        </button>
      </form>
    </section>
  );
}
