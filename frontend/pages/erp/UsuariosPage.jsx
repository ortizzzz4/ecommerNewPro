import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  setPinUsuario,
  getPermisosDisponibles,
  getRoles,
  getUsuarios,
  saveRol,
  saveUsuario,
} from '../../api/ApisCrud';
import { toList } from '../../utils/data';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../utils/ui';

const TABS = [
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'roles', label: 'Roles y permisos' },
];

const VACIO_USUARIO = { username: '', email: '', carnet: '', password: '', is_active: true, groups: [] };

function ErrorLista({ errores }) {
  if (!errores) return null;
  const mensajes = Object.values(errores).flat().join(' ');
  return <p className="text-sm text-red-600 dark:text-red-400">{mensajes}</p>;
}

// ── PIN de un usuario (lo asigna un administrador) ────────
function PinModal({ usuario, onCerrar, onGuardado }) {
  const [pin, setPin] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(pin)) return setError('El PIN debe tener entre 4 y 6 dígitos.');
    if (pin !== confirmacion) return setError('Los PIN no coinciden.');
    setGuardando(true);
    try {
      await setPinUsuario(usuario.id, pin);
      toast.success(`PIN de ${usuario.username} actualizado`);
      onGuardado();
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo guardar el PIN');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <form onSubmit={guardar} className={`${cardClass} w-full max-w-sm space-y-4 p-6`}>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">PIN de {usuario.username}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Lo usa para entrar al punto de venta. De 4 a 6 dígitos.</p>
        </div>
        <div>
          <label htmlFor="pin-nuevo" className={labelClass}>Nuevo PIN</label>
          <input id="pin-nuevo" type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} className={inputClass} />
        </div>
        <div>
          <label htmlFor="pin-confirma" className={labelClass}>Confirmar PIN</label>
          <input id="pin-confirma" type="password" inputMode="numeric" maxLength={6} value={confirmacion} onChange={e => setConfirmacion(e.target.value.replace(/\D/g, ''))} className={inputClass} />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCerrar} className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancelar</button>
          <button type="submit" disabled={guardando} className={`${primaryButtonClass} w-auto px-5`}>{guardando ? 'Guardando...' : 'Guardar PIN'}</button>
        </div>
      </form>
    </div>
  );
}

// ── Usuarios ──────────────────────────────────────────────
function UsuariosTab({ roles }) {
  const [pinDe, setPinDe] = useState(null);
  const [usuarios, setUsuarios] = useState(null);
  const [form, setForm] = useState(null); // null = cerrado; {id?, ...}
  const [errores, setErrores] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => getUsuarios().then(res => setUsuarios(toList(res.data)));
  useEffect(() => {
    cargar().catch(() => setUsuarios([]));
  }, []);

  const campo = (nombre, valor) => setForm(prev => ({ ...prev, [nombre]: valor }));

  const toggleRol = (rolId) => {
    setForm(prev => ({
      ...prev,
      groups: prev.groups.includes(rolId)
        ? prev.groups.filter(id => id !== rolId)
        : [...prev.groups, rolId],
    }));
  };

  const editar = (usuario) => {
    setErrores(null);
    setForm({
      id: usuario.id,
      username: usuario.username,
      email: usuario.email,
      carnet: usuario.carnet || '',
      password: '',
      is_active: usuario.is_active,
      groups: usuario.groups,
    });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setErrores(null);
    const { id, password, ...resto } = form;
    const datos = password ? { ...resto, password } : resto;
    try {
      await saveUsuario(id, datos);
      toast.success(id ? 'Usuario actualizado' : 'Usuario creado');
      setForm(null);
      await cargar();
    } catch (err) {
      setErrores(err.response?.data || { detalle: ['No se pudo guardar el usuario.'] });
    } finally {
      setGuardando(false);
    }
  };

  const nombresDeRoles = (ids) => roles
    .filter(r => ids.includes(r.id))
    .map(r => r.name);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {!form && (
          <button onClick={() => { setErrores(null); setForm({ ...VACIO_USUARIO }); }} className={`${primaryButtonClass} w-auto px-5`}>
            Nuevo usuario
          </button>
        )}
      </div>

      {pinDe && (
        <PinModal usuario={pinDe} onCerrar={() => setPinDe(null)} onGuardado={() => { setPinDe(null); cargar(); }} />
      )}

      {form && (
        <form onSubmit={guardar} className={`${cardClass} grid gap-4 p-6 md:grid-cols-2`}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white md:col-span-2">
            {form.id ? `Editar ${form.username}` : 'Nuevo usuario'}
          </h2>

          <div>
            <label htmlFor="u-username" className={labelClass}>Usuario</label>
            <input
              id="u-username" required disabled={Boolean(form.id)}
              value={form.username} onChange={e => campo('username', e.target.value)}
              className={`${inputClass} disabled:opacity-60`}
            />
          </div>

          <div>
            <label htmlFor="u-carnet" className={labelClass}>Carnet (DUI, para ingresar)</label>
            <input id="u-carnet" value={form.carnet || ''} onChange={e => campo('carnet', e.target.value)} placeholder="00000000-0" className={inputClass} />
          </div>

          <div>
            <label htmlFor="u-email" className={labelClass}>Correo</label>
            <input id="u-email" type="email" value={form.email} onChange={e => campo('email', e.target.value)} className={inputClass} />
          </div>

          <div>
            <label htmlFor="u-password" className={labelClass}>
              {form.id ? 'Nueva contraseña (opcional)' : 'Contraseña (mínimo 8 caracteres)'}
            </label>
            <input
              id="u-password" type="password" autoComplete="new-password"
              required={!form.id} minLength={form.password ? 8 : undefined}
              value={form.password} onChange={e => campo('password', e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 pb-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={form.is_active} onChange={e => campo('is_active', e.target.checked)} className="accent-indigo-600" />
              Cuenta activa
            </label>
          </div>

          <div className="md:col-span-2">
            <p className={labelClass}>Roles</p>
            {roles.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No hay roles todavía. Créalos en la pestaña "Roles y permisos".</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {roles.map(rol => {
                  const activo = form.groups.includes(rol.id);
                  return (
                    <button
                      type="button" key={rol.id} onClick={() => toggleRol(rol.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        activo
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      {rol.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <ErrorLista errores={errores} />

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
        {usuarios === null ? (
          <p className="animate-pulse px-6 py-12 text-center text-slate-500">Cargando usuarios...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3">Usuario</th>
                  <th className="px-6 py-3">Roles</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usuarios.map(usuario => (
                  <tr key={usuario.id}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900 dark:text-white">{usuario.username}</p>
                      <p className="text-slate-500 dark:text-slate-400">{usuario.email || '—'}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {nombresDeRoles(usuario.groups).join(', ') || <span className="text-slate-400">Sin rol</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        usuario.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {usuario.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button onClick={() => editar(usuario)} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                        Editar
                      </button>
                      <span className="mx-2 text-slate-300 dark:text-slate-700">|</span>
                      <button onClick={() => setPinDe(usuario)} className="font-semibold text-slate-600 hover:underline dark:text-slate-300">
                        {usuario.tiene_pin ? 'Cambiar PIN' : 'Asignar PIN'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Roles y permisos ──────────────────────────────────────
function RolesTab({ roles, onCambio }) {
  const [permisos, setPermisos] = useState([]);
  const [form, setForm] = useState(null); // {id?, name, permissions: []}
  const [errores, setErrores] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getPermisosDisponibles().then(res => setPermisos(toList(res.data))).catch(() => setPermisos([]));
  }, []);

  const porApp = useMemo(() => {
    const grupos = {};
    permisos.forEach(p => {
      grupos[p.app] = [...(grupos[p.app] || []), p];
    });
    return grupos;
  }, [permisos]);

  const togglePermiso = (id) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(id)
        ? prev.permissions.filter(p => p !== id)
        : [...prev.permissions, id],
    }));
  };

  const editar = (rol) => {
    setErrores(null);
    setForm({ id: rol.id, name: rol.name, permissions: rol.permissions });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setErrores(null);
    try {
      await saveRol(form.id, { name: form.name, permissions: form.permissions });
      toast.success('Rol guardado');
      setForm(null);
      onCambio();
    } catch (err) {
      setErrores(err.response?.data || { detalle: ['No se pudo guardar el rol.'] });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className={`${cardClass} h-fit overflow-hidden lg:col-span-1`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">Roles</h2>
          <button
            onClick={() => { setErrores(null); setForm({ name: '', permissions: [] }); }}
            className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Nuevo rol
          </button>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {roles.map(rol => (
            <li key={rol.id}>
              <button onClick={() => editar(rol)} className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <span className="font-medium text-slate-900 dark:text-white">{rol.name}</span>
                <span className="text-xs text-slate-500">{rol.permissions.length} permisos</span>
              </button>
            </li>
          ))}
          {roles.length === 0 && <li className="px-5 py-6 text-sm text-slate-500">Aún no hay roles.</li>}
        </ul>
      </div>

      <div className="lg:col-span-2">
        {form ? (
          <form onSubmit={guardar} className={`${cardClass} space-y-5 p-6`}>
            <div>
              <label htmlFor="rol-nombre" className={labelClass}>Nombre del rol</label>
              <input id="rol-nombre" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="Supervisor" />
            </div>

            <div className="space-y-5">
              {Object.entries(porApp).map(([app, lista]) => (
                <fieldset key={app}>
                  <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{app}</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {lista.map(permiso => (
                      <label key={permiso.id} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(permiso.id)}
                          onChange={() => togglePermiso(permiso.id)}
                          className="mt-0.5 accent-indigo-600"
                        />
                        <span>
                          {permiso.nombre}
                          <span className="block text-xs text-slate-400">{permiso.codigo}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <ErrorLista errores={errores} />

            <div className="flex gap-3">
              <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className={`${primaryButtonClass} w-auto px-6`}>
                {guardando ? 'Guardando...' : 'Guardar rol'}
              </button>
            </div>
          </form>
        ) : (
          <div className={`${cardClass} p-10 text-center text-slate-500 dark:text-slate-400`}>
            Elige un rol para ver y cambiar sus permisos, o crea uno nuevo.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────
export function UsuariosPage() {
  const [tab, setTab] = useState('usuarios');
  const [roles, setRoles] = useState([]);

  const cargarRoles = () => getRoles().then(res => setRoles(toList(res.data))).catch(() => setRoles([]));
  useEffect(() => {
    cargarRoles();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Usuarios y permisos</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Cada persona tiene uno o más roles. Un rol agrupa los permisos que puede usar.
        </p>
      </header>

      <nav className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'usuarios' ? <UsuariosTab roles={roles} /> : <RolesTab roles={roles} onCambio={cargarRoles} />}
    </div>
  );
}
