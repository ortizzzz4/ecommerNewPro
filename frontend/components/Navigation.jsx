import { Link, NavLink } from 'react-router-dom';
import { MoonIcon, ShoppingCartIcon, SunIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { sitio } from '../config/sitio';

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition-colors ${
    isActive
      ? 'text-indigo-600 dark:text-indigo-400'
      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
  }`;

const anclaClass = 'text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white';

const iconButtonClass =
  'rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white';

// Barra del sitio web: secciones de la portada, tienda, carrito y cuenta de cliente.
// Las secciones con ancla (#servicios) funcionan desde cualquier página del sitio.
export function Navigation() {
  const isLoggedIn = Boolean(localStorage.getItem('access_token'));
  const { isDark, toggleTheme } = useTheme();
  const { getCartCount } = useCart();
  const cartCount = getCartCount();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">O</span>
          {sitio.nombre}
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          <a href="/#servicios" className={anclaClass}>Servicios</a>
          <a href="/#proceso" className={anclaClass}>Proceso</a>
          <a href="/#resenas" className={anclaClass}>Reseñas</a>
          <NavLink to="/productos" className={navLinkClass}>Productos</NavLink>
          <a href="/#contacto" className={anclaClass}>Contacto</a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={toggleTheme} className={iconButtonClass} aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}>
            {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>

          <Link to="/cart" className={`relative ${iconButtonClass}`} aria-label="Ver carrito">
            <ShoppingCartIcon className="h-6 w-6" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-xs font-semibold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {!isLoggedIn && (
            <>
              <Link to="/login" className="hidden text-sm font-medium text-slate-700 hover:text-indigo-600 sm:block dark:text-slate-200 dark:hover:text-indigo-400">
                Iniciar sesión
              </Link>
              <Link to="/empresa/registro" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                Prueba gratis
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
