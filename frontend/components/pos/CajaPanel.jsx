import { useState } from 'react';
import { toast } from 'sonner';
import { abrirCaja, cerrarCaja } from '../../api/ApisCrud';
import { formatPrice } from '../../utils/format';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../utils/ui';

// Billetes y monedas de dólar. `clave` es la etiqueta que espera el backend (pos/services.py),
// `centavos` el valor para sumar sin errores de punto flotante.
const BILLETES = [
  { clave: '100', etiqueta: '$100', centavos: 10000 },
  { clave: '50', etiqueta: '$50', centavos: 5000 },
  { clave: '20', etiqueta: '$20', centavos: 2000 },
  { clave: '10', etiqueta: '$10', centavos: 1000 },
  { clave: '5', etiqueta: '$5', centavos: 500 },
  { clave: '1', etiqueta: '$1', centavos: 100 },
];
const MONEDAS = [
  { clave: '0.50', etiqueta: '50¢', centavos: 50 },
  { clave: '0.25', etiqueta: '25¢', centavos: 25 },
  { clave: '0.10', etiqueta: '10¢', centavos: 10 },
  { clave: '0.05', etiqueta: '5¢', centavos: 5 },
  { clave: '0.01', etiqueta: '1¢', centavos: 1 },
];

// Conteo de efectivo por denominación: el cajero escribe cuántas piezas tiene de cada una
function ConteoEfectivo({ conteo, onCambio }) {
  const filas = (denominaciones) => denominaciones.map(d => (
    <label key={d.clave} className="flex items-center gap-2">
      <span className="w-14 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">{d.etiqueta}</span>
      <input
        type="number" min="0" step="1" inputMode="numeric" aria-label={`Cantidad de ${d.etiqueta}`}
        value={conteo[d.clave] ?? ''} placeholder="0"
        onChange={e => onCambio(d.clave, e.target.value)}
        className={`${inputClass} mt-0 py-1.5 text-center`}
      />
    </label>
  ));

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Billetes</p>
        {filas(BILLETES)}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Monedas</p>
        {filas(MONEDAS)}
      </div>
    </div>
  );
}

// Apertura de caja: el cajero cuenta billetes y monedas con los que empieza el turno
export function AperturaCaja({ token, onAbierta, onSalir }) {
  const [conteo, setConteo] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const total = [...BILLETES, ...MONEDAS].reduce(
    (suma, d) => suma + d.centavos * (parseInt(conteo[d.clave], 10) || 0), 0,
  );

  const cambiarCantidad = (clave, valor) => {
    setConteo(prev => ({ ...prev, [clave]: valor === '' ? '' : Math.max(0, parseInt(valor, 10) || 0) }));
  };

  const abrir = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    // Solo se envían las denominaciones con piezas; el backend valida y suma el total
    const desglose = Object.fromEntries(
      [...BILLETES, ...MONEDAS]
        .filter(d => parseInt(conteo[d.clave], 10) > 0)
        .map(d => [d.clave, parseInt(conteo[d.clave], 10)]),
    );
    try {
      const { data } = await abrirCaja((total / 100).toFixed(2), token, desglose);
      toast.success('Caja abierta');
      onAbierta(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo abrir la caja.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <form onSubmit={abrir} className={`${cardClass} w-full max-w-md space-y-5 p-8`}>
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Abrir caja</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Cuenta los billetes y monedas con los que inicias el turno.
          </p>
        </div>

        <ConteoEfectivo conteo={conteo} onCambio={cambiarCantidad} />

        <div className="flex items-baseline justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Efectivo inicial</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">{formatPrice(total / 100)}</span>
        </div>

        {error && <p className="text-center text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={guardando} className={primaryButtonClass}>
          {guardando ? 'Abriendo...' : 'Abrir caja'}
        </button>
        {onSalir && (
          <button type="button" onClick={onSalir} className="w-full text-sm text-slate-500 hover:underline dark:text-slate-400">
            Volver al ERP
          </button>
        )}
      </form>
    </div>
  );
}

// Cierre de caja: se cuenta el efectivo, se concilia y se imprime el corte
export function CierreCaja({ caja, token, impresoraId, onCancelar, onCerrada }) {
  const [contado, setContado] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  const cerrar = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const { data } = await cerrarCaja(contado, impresoraId || null, token);
      setResultado(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo cerrar la caja.');
    } finally {
      setGuardando(false);
    }
  };

  const fila = (etiqueta, valor, destacado = false) => (
    <div className={`flex justify-between ${destacado ? 'pt-2 text-base font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
      <dt>{etiqueta}</dt>
      <dd>{valor === null || valor === undefined ? '—' : formatPrice(valor)}</dd>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
      <div className={`${cardClass} w-full max-w-md space-y-5 p-6`}>
        {!resultado ? (
          <form onSubmit={cerrar} className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Cerrar caja</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Cuenta todo el efectivo de la caja y escribe el monto. Se compara con lo que debería haber.
              </p>
            </div>
            <dl className="space-y-1 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
              {fila('Efectivo inicial', caja.monto_inicial)}
            </dl>
            <div>
              <label htmlFor="contado" className={labelClass}>Efectivo contado (USD)</label>
              <input
                id="contado" type="number" min="0" step="0.01" autoFocus required
                value={contado} onChange={e => setContado(e.target.value)}
                className={`${inputClass} text-center text-2xl`}
              />
            </div>
            {error && <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onCancelar} className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                Cancelar
              </button>
              <button type="submit" disabled={guardando || contado === ''} className={`${primaryButtonClass} w-auto px-5`}>
                {guardando ? 'Cerrando...' : 'Cerrar caja'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Caja cerrada</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Resumen del turno</p>
            </div>
            <dl className="space-y-2 text-sm">
              {fila('Efectivo inicial', resultado.caja.monto_inicial)}
              {fila('Ventas en efectivo', resultado.caja.total_efectivo)}
              {fila('Ventas con tarjeta', resultado.caja.total_tarjeta)}
              {fila('Ventas por transferencia', resultado.caja.total_transferencia)}
              <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
              {fila('Efectivo esperado', resultado.caja.esperado_efectivo)}
              {fila('Efectivo contado', resultado.caja.monto_contado)}
              {fila('Diferencia', resultado.caja.diferencia, true)}
            </dl>
            {Number(resultado.caja.diferencia) !== 0 && (
              <p className={`rounded-lg px-4 py-3 text-sm ${Number(resultado.caja.diferencia) < 0 ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                {Number(resultado.caja.diferencia) < 0 ? 'Faltan' : 'Sobran'} {formatPrice(Math.abs(Number(resultado.caja.diferencia)))} en la caja.
              </p>
            )}
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {resultado.impresion?.ok ? resultado.impresion.detail : `Corte no impreso: ${resultado.impresion?.detail}`}
            </p>
            <button onClick={onCerrada} className={primaryButtonClass}>Terminar</button>
          </div>
        )}
      </div>
    </div>
  );
}
