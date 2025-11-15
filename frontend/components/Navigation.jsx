import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

import { useCart } from '../context/CartContext';

import { getCurrentUser } from '../api/ApisCrud';

export function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  
  const { getCartCount } = useCart();
  const cartCount = getCartCount();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsLoggedIn(true);
      // Llamar API para saber si es staff
      getCurrentUser()
        .then(res => {
          setIsStaff(res.data.is_staff);
          localStorage.setItem('isStaff', res.data.is_staff);
        })
        .catch(() => setIsStaff(false));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('isStaff');
    localStorage.removeItem('username');
    window.location.href = '/login';
  };

  return (
    <nav className="bg-gradient-to-r from-cyan-300 to-indigo-600 p-4 shadow-md">
      <div className="container mx-auto flex items-center justify-between flex-wrap">
        <Link to="/productos" className="text-white font-bold text-2xl">Ortiz</Link>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-white md:hidden focus:outline-none"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={
                menuOpen
                  ? 'M5 18L18 6M6 6l12 12'
                  : 'M4 6h16M4 12h16M4 18h16'
              }
            />
          </svg>
        </button>

        <div
          className={`${
            menuOpen ? 'block' : 'hidden'
          } w-full md:flex md:items-center md:w-auto`}
        >
          <div className="flex flex-col md:flex-row gap-2 mt-4 md:mt-0">

           
            {isStaff && (
              <Link
                to="/productos-create"
                className="bg-white text-indigo-600 px-4 py-2 rounded-md hover:bg-gray-100 transition"
              >
                Crear Producto
              </Link>
            )}

           <Link to="/cart" className="relative">
        🛒 Carrito
        {cartCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
            {cartCount}
          </span>
        )}
      </Link>

            {isLoggedIn ? (
              <>
                <Link
                  to="/direcciones"
                  className="bg-white text-indigo-600 px-4 py-2 rounded-md hover:bg-gray-100 transition"
                >
                  Direcciones
                </Link>
                <Link
                  to="/pedidos"
                  className="bg-white text-indigo-600 px-4 py-2 rounded-md hover:bg-gray-100 transition"
                >
                  Pedidos
                </Link>
                <Link
                  to="/pagos"
                  className="bg-white text-indigo-600 px-4 py-2 rounded-md hover:bg-gray-100 transition"
                >
                  Métodos de Pago
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="bg-white text-indigo-600 px-4 py-2 rounded-md hover:bg-gray-100 transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-white text-indigo-600 px-4 py-2 rounded-md hover:bg-gray-100 transition"
                >
                  Registro
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
