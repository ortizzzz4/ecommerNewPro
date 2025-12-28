import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getCurrentUser } from '../api/ApisCrud';
import { useTheme } from '../context/ThemeContext'; // Importar

export function Navigation() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const { isDark, toggleTheme } = useTheme(); // Usar tema

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUsername = localStorage.getItem('username');
    if (token) {
      setIsLoggedIn(true);
      setUsername(storedUsername || 'Usuario');
      getCurrentUser()
        .then(res => {
          localStorage.setItem('isStaff', res.data.is_staff);
        })
        .catch(() => {});
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('isStaff');
    localStorage.removeItem('username');
    window.location.href = '/login';
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <nav className="bg-gradient-to-r from-cyan-500 to-indigo-600 dark:from-gray-800 dark:to-gray-900 shadow-lg transition-colors">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-2 transition-colors">
              <span className="text-2xl">🏪</span>
            </div>
            <span className="text-white font-bold text-2xl">Ortiz</span>
          </Link>

          <div className="flex items-center gap-4">
            {/* Botón de cambio de tema */}
            <button
              onClick={toggleTheme}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all"
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              <span className="text-2xl">
                {isDark ? '☀️' : '🌙'}
              </span>
            </button>

            <div className="hidden md:flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
              <span className="text-xl">👤</span>
              <span className="text-white font-medium">{username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all shadow-md font-medium"
            >
              <span>🚪</span>
              <span className="hidden md:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}