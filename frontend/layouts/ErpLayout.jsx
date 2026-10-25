import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRightOnRectangleIcon,
  MoonIcon,
  Squares2X2Icon,
  SunIcon,
} from '@heroicons/react/24/outline';
import { cambiarEmpresa, getMisEmpresas } from '../api/ApisCrud';
import { erpModules } from '../config/erpModules';
import { useTheme } from '../context/ThemeContext';
import { PermisosProvider, moduloVisible, usePermisos } from '../context/PermisosContext';

// Módulo al que pertenece la ruta: por su ruta base o por una de sus pantallas
const moduloDeRuta = (pathname) => erpModules.find(m =>
  pathname === m.path
  || pathname.startsWith(`${m.path}/`)
  || (m.screens || []).some(s => pathname.startsWith(s.to))
);

const menuLinkClass = ({ isActive }) =>
  `whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
    isActive ? 'border-indigo-400 text-white' : 'border-transparent text-slate-300 hover:text-white'
  }`;

// Cambio de empresa: solo aparece si la persona tiene cuenta en más de una.
// Cambiar no pide contraseña: la cuenta en cada empresa ya quedó registrada al iniciar sesión en ella.
function CambioEmpresa({ miEmpresa }) {
  const [empresas, setEmpresas] = useState([]);
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    getMisEmpresas().then(({ data }) => setEmpresas(data)).catch(() => setEmpresas([]));
  }, [miEmpresa?.empresa]);

  if (empresas.length < 2) return null;

  const cambiar = async (e) => {
    setCambiando(true);
    try {
      const { data } = await cambiarEmpresa(e.target.value);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      window.location.href = '/erp';
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo cambiar de empresa');
      setCambiando(false);
    }
  };

  return (
    <select
      value={miEmpresa?.empresa || ''} onChange={cambiar} disabled={cambiando} aria-label="Cambiar de empresa"
      className="max-w-[9rem] truncate rounded-md bg-slate-800 px-2 py-1.5 text-sm text-white ring-1 ring-white/10 sm:max-w-xs"
    >
      {empresas.map(empresa => (
        <option key={empresa.empresa} value={empresa.empresa} disabled={empresa.bloqueada}>
          {empresa.nombre}{empresa.bloqueada ? ' (bloqueada)' : ''}
        </option>
      ))}
    </select>
  );
}

// Base bloqueada o vencida: se puede entrar, pero no usar los módulos
function BaseBloqueada({ miEmpresa }) {
  const vencida = miEmpresa.vencida && !miEmpresa.bloqueada;
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900 dark:bg-slate-900">
      <h2 className="text-xl font-bold text-red-700 dark:text-red-400">
        {vencida ? 'Tu base de datos ha expirado' : 'Tu base de datos se encuentra bloqueada'}
      </h2>
      <p className="mt-3 text-slate-600 dark:text-slate-300">
        {vencida
          ? 'Activa una suscripción para volver a usar los módulos de tu empresa.'
          : 'Contacta a soporte para reactivarla.'}
      </p>
      {vencida && (
        <Link to="/erp/suscripcion" className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700">
          Elegir plan
        </Link>
      )}
    </div>
  );
}

// Aviso de la prueba: días restantes (si la base ya está bloqueada o vencida, lo dice la pantalla de bloqueo)
function AvisoPrueba({ miEmpresa }) {
  if (!miEmpresa?.empresa || miEmpresa.suscripcion_activa || miEmpresa.vencida || miEmpresa.bloqueada) return null;

  const enlace = (
    <Link to="/erp/suscripcion" className="ml-2 font-semibold underline underline-offset-2">Elegir plan</Link>
  );

  if (miEmpresa.vencida) {
    return (
      <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        La prueba de 30 días terminó. Puedes consultar tus datos, pero no registrar movimientos hasta activar tu suscripción.
        {enlace}
      </div>
    );
  }
  return (
    <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
      Prueba gratis: te quedan {miEmpresa.dias_restantes} días.
      {enlace}
    </div>
  );
}

function ErpShell() {
  const { isDark, toggleTheme } = useTheme();
  const { usuario, can, miEmpresa } = usePermisos();
  const { pathname } = useLocation();
  const username = usuario?.username || 'Usuario';

  // Solo se ven los módulos contratados y para los que el usuario tiene permiso
  const modulosVisibles = erpModules.filter(m => moduloVisible(m, { can, usuario, miEmpresa }));
  const modulo = moduloDeRuta(pathname);
  const moduloPermitido = modulo && modulosVisibles.includes(modulo) ? modulo : null;

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('isStaff');
    localStorage.removeItem('username');
    sessionStorage.removeItem('pos_token');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-sm">
        <div className="flex h-12 items-center gap-2 px-3 sm:px-4">
          <Link to="/erp" aria-label="Ver aplicaciones" className="rounded-md p-2 transition hover:bg-white/10">
            <Squares2X2Icon className="h-5 w-5" />
          </Link>
          <span className="truncate font-semibold">{moduloPermitido ? moduloPermitido.title : (miEmpresa?.nombre || 'Ortiz ERP')}</span>
          {miEmpresa?.es_prueba && (
            <span className="rounded bg-violet-500/30 px-1.5 py-0.5 text-xs font-semibold text-violet-200">PRUEBAS</span>
          )}

          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            <Link to="/erp/empresas" className="hidden whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white sm:block">
              Mis empresas
            </Link>
            <CambioEmpresa miEmpresa={miEmpresa} />
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
              className="rounded-md p-2 transition hover:bg-white/10"
            >
              {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
            <span className="hidden text-sm text-slate-300 sm:inline">{username}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold uppercase">
              {username.charAt(0)}
            </span>
            <button
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="rounded-md p-2 transition hover:bg-white/10"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {moduloPermitido?.screens?.length > 0 && (
          <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-3 sm:px-4">
            {moduloPermitido.screens.map(screen => (
              <NavLink key={screen.to} to={screen.to} className={menuLinkClass}>
                {screen.title}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="p-4 sm:p-8">
        <AvisoPrueba miEmpresa={miEmpresa} />
        {(miEmpresa?.bloqueada || miEmpresa?.vencida) && !pathname.startsWith('/erp/suscripcion')
          ? <BaseBloqueada miEmpresa={miEmpresa} />
          : <Outlet />}
      </main>
    </div>
  );
}

export function ErpLayout() {
  return (
    <PermisosProvider>
      <ErpShell />
    </PermisosProvider>
  );
}
