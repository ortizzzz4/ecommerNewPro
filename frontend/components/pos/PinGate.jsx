import { useState } from 'react';
import { toast } from 'sonner';
import { desbloquearPos, setMiPin } from '../../api/ApisCrud';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../utils/ui';

const PIN_REGEX = /^\d{4,6}$/;

// Pantalla de entrada al POS: el cajero se identifica con su PIN antes de vender
export function PinGate({ usuario, onDesbloqueado }) {
  const [pin, setPin] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const tienePin = Boolean(usuario?.tiene_pin);

  const desbloquear = async (valor) => {
    const { data } = await desbloquearPos(valor);
    onDesbloqueado(data.token);
  };

  const entrar = async (e) => {
    e.preventDefault();
    setError('');
    if (!PIN_REGEX.test(pin)) {
      setError('El PIN debe tener entre 4 y 6 dígitos.');
      return;
    }
    setCargando(true);
    try {
      await desbloquear(pin);
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo desbloquear el punto de venta.');
      setPin('');
    } finally {
      setCargando(false);
    }
  };

  const crearPin = async (e) => {
    e.preventDefault();
    setError('');
    if (!PIN_REGEX.test(pin)) {
      setError('El PIN debe tener entre 4 y 6 dígitos.');
      return;
    }
    if (pin !== confirmacion) {
      setError('Los PIN no coinciden.');
      return;
    }
    setCargando(true);
    try {
      await setMiPin('', pin);
      toast.success('PIN creado');
      await desbloquear(pin);
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo crear el PIN.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form onSubmit={tienePin ? entrar : crearPin} className={`${cardClass} w-full max-w-sm space-y-5 p-8`}>
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
            {usuario?.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
            {tienePin ? 'Ingresa tu PIN' : 'Crea tu PIN'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {tienePin
              ? `Hola${usuario?.username ? `, ${usuario.username}` : ''}. Para vender necesitas tu PIN.`
              : 'Primera vez en el punto de venta. Elige un PIN de 4 a 6 dígitos.'}
          </p>
        </div>

        <div>
          <label htmlFor="pin" className={labelClass}>PIN</label>
          <input
            id="pin" type="password" inputMode="numeric" autoComplete="off" autoFocus
            maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
          />
        </div>

        {!tienePin && (
          <div>
            <label htmlFor="pin2" className={labelClass}>Confirma tu PIN</label>
            <input
              id="pin2" type="password" inputMode="numeric" autoComplete="off"
              maxLength={6} value={confirmacion} onChange={e => setConfirmacion(e.target.value.replace(/\D/g, ''))}
              className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
            />
          </div>
        )}

        {error && <p className="text-center text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={cargando || !pin} className={primaryButtonClass}>
          {cargando ? 'Verificando...' : tienePin ? 'Entrar al punto de venta' : 'Crear PIN y entrar'}
        </button>
      </form>
    </div>
  );
}
