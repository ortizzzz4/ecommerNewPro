import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Navigation } from '../components/Navigation';
import { PermisosProvider, tieneAccesoErp, usePermisos } from '../context/PermisosContext';
import { sitio } from '../config/sitio';

function SiteShell() {
  const { usuario, cargando } = usePermisos();
  const { pathname } = useLocation();

  if (cargando) return null;
  // Quien usa el ERP trabaja desde sus módulos y no ve la tienda.
  // Crear otra empresa es la excepción: quien ya tiene sesión también puede hacerlo.
  if (tieneAccesoErp(usuario) && !pathname.startsWith('/empresa/registro')) return <Navigate to="/erp" replace />;

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:justify-between sm:px-6 dark:text-slate-400">
          <span>© {new Date().getFullYear()} {sitio.nombre}. Todos los derechos reservados.</span>
          <span>{sitio.correo} · {sitio.telefono} · {sitio.ubicacion}</span>
        </div>
      </footer>
    </div>
  );
}

// Envoltura de la tienda pública
export function SiteLayout() {
  return (
    <PermisosProvider>
      <SiteShell />
    </PermisosProvider>
  );
}
