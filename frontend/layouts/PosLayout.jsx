import { Link } from 'react-router-dom';
import { usePermisos } from '../context/PermisosContext';

// Pantalla del punto de venta: sin barra lateral del ERP, en su propia pestaña
export function PosLayout({ children }) {
  const { usuario } = usePermisos();

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">O</span>
          <span className="font-bold text-slate-900 dark:text-white">Ortiz · Punto de venta</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {usuario && <span className="hidden text-slate-600 sm:inline dark:text-slate-300">{usuario.username}</span>}
          <Link to="/erp" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            Ir al ERP ↗
          </Link>
        </div>
      </header>
      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}
