import { Link } from 'react-router-dom';
import { erpModules } from '../../config/erpModules';
import { moduloVisible, usePermisos } from '../../context/PermisosContext';

// Inicio del ERP: una cuadrícula con los módulos contratados a los que tiene acceso el usuario
export function AppsPage() {
  const { can, usuario, miEmpresa, cargando } = usePermisos();

  if (cargando) return <p className="animate-pulse py-20 text-center text-slate-500 dark:text-slate-400">Cargando...</p>;

  const modulos = erpModules.filter(m => moduloVisible(m, { can, usuario, miEmpresa }));

  if (modulos.length === 0) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sin módulos asignados</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Tu rol no tiene acceso a ningún módulo. Pide a un administrador que te lo asigne.
        </p>
        <Link to="/" className="mt-6 inline-block font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          Ir a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-10 text-2xl font-semibold text-slate-900 dark:text-white">Aplicaciones</h1>
      <div className="grid grid-cols-3 gap-x-4 gap-y-10 sm:grid-cols-4 md:grid-cols-6">
        {modulos.map(modulo => {
          const Icon = modulo.icon;
          const contenido = (
            <>
              <span className={`flex h-20 w-20 items-center justify-center rounded-2xl text-white shadow-md transition group-hover:-translate-y-1 group-hover:shadow-lg ${modulo.color}`}>
                <Icon className="h-10 w-10" />
              </span>
              <span className="mt-3 text-center text-sm font-medium text-slate-700 dark:text-slate-200">{modulo.title}</span>
            </>
          );

          return modulo.externo ? (
            <a key={modulo.id} href={modulo.path} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center">
              {contenido}
            </a>
          ) : (
            <Link key={modulo.id} to={modulo.path} className="group flex flex-col items-center">
              {contenido}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
