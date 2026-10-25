import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { loginEmpresa } from '../../api/ApisCrud';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../utils/ui';

// Ingreso al ERP de una empresa: identificador de empresa, usuario y contraseña
export function IngresarEmpresaPage() {
  const location = useLocation();
  const [empresa, setEmpresa] = useState(location.state?.empresa || '');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const ingresar = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { data } = await loginEmpresa(empresa.trim().toLowerCase(), usuario.trim(), password);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('username', usuario.trim());
      // Recarga completa para que el ERP lea la sesión nueva
      window.location.href = '/erp';
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo iniciar sesión.');
      setCargando(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <form onSubmit={ingresar} className={`${cardClass} space-y-5 p-8`}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Ingresar a mi empresa</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Usa el identificador que elegiste al registrarte.</p>
        </div>

        <div>
          <label htmlFor="empresa" className={labelClass}>Identificador de empresa</label>
          <input id="empresa" required value={empresa} onChange={e => setEmpresa(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="usuario" className={labelClass}>Usuario</label>
          <input id="usuario" required value={usuario} onChange={e => setUsuario(e.target.value)} autoComplete="username" className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Contraseña</label>
          <input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className={inputClass} />
        </div>

        {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={cargando} className={primaryButtonClass}>
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          ¿Aún no tienes empresa? <Link to="/empresa/registro" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Prueba gratis</Link>
        </p>
      </form>
    </div>
  );
}
