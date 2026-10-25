import { Link } from 'react-router-dom';
import { erpModules } from '../../config/erpModules';
import { cardClass } from '../../utils/ui';

// Página de entrada de un módulo con enlaces a sus pantallas
export function ModuleHubPage({ moduleId }) {
  const module = erpModules.find(m => m.id === moduleId);
  if (!module) return null;

  const Icon = module.icon;

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{module.title}</h1>
          <p className="text-slate-500 dark:text-slate-400">{module.description}</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {module.screens.map(screen => (
          <Link
            key={screen.to}
            to={screen.to}
            className={`${cardClass} group p-6 transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md`}
          >
            <h2 className="font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
              {screen.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{screen.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
