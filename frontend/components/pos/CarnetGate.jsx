import { useEffect, useState } from 'react';
import { loginCarnet } from '../../api/ApisCrud';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../utils/ui';

// Entrada al punto de venta: solo se escanea el carnet (DUI), sin PIN
export function CarnetGate() {
  const [carnet, setCarnet] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    document.getElementById('carnet-pos')?.focus();
  }, []);

  const entrar = async (e) => {
    e.preventDefault();
    setError('');
    if (carnet.length !== 9) {
      setError('El carnet debe tener 9 dígitos. Escanéalo de nuevo.');
      return;
    }
    setCargando(true);
    try {
      const { data } = await loginCarnet(carnet);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('username', data.username);
      sessionStorage.setItem('pos_token', data.pos_token);
      // Recarga para que los permisos del cajero se carguen con la sesión nueva
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo iniciar sesión con ese carnet.');
      setCarnet('');
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form onSubmit={entrar} className={`${cardClass} w-full max-w-sm space-y-5 p-8`}>
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Punto de venta</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Escanea tu carnet para entrar.</p>
        </div>

        <div>
          <label htmlFor="carnet-pos" className={labelClass}>Carnet</label>
          <input
            id="carnet-pos" type="text" inputMode="numeric" autoComplete="off" autoFocus
            value={carnet}
            onChange={e => setCarnet(e.target.value.replace(/\D/g, '').slice(0, 9))}
            placeholder="Escanea el código de barras del DUI"
            className={`${inputClass} text-center text-lg tracking-widest`}
          />
        </div>

        {error && <p className="text-center text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={cargando} className={primaryButtonClass}>
          {cargando ? 'Entrando...' : 'Entrar al punto de venta'}
        </button>
      </form>
    </div>
  );
}
