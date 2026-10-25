import { usePermisos } from '../context/PermisosContext';
import { cardClass } from '../utils/ui';

// Muestra la página solo si el usuario tiene el permiso indicado
export function RequierePermiso({ permiso, children }) {
  const { can, cargando } = usePermisos();

  if (cargando) {
    return <p className="animate-pulse py-20 text-center text-slate-500 dark:text-slate-400">Cargando...</p>;
  }

  if (!can(permiso)) {
    return (
      <div className={`${cardClass} mx-auto max-w-md p-10 text-center`}>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sin acceso</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Tu rol no tiene permiso para esta sección. Pide a un administrador que te lo asigne.
        </p>
      </div>
    );
  }

  return children;
}
