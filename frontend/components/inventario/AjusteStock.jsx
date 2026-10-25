import { useState } from 'react';
import { toast } from 'sonner';
import { crearMovimiento } from '../../api/ApisCrud';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../utils/ui';

// Registra una entrada (compra o recepción) o un ajuste manual de existencias
export function AjusteStock({ producto, onCerrar, onGuardado }) {
  const [tipo, setTipo] = useState('entrada');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await crearMovimiento({ producto_id: producto.id, tipo, cantidad, motivo });
      toast.success('Existencias actualizadas');
      onGuardado();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo registrar el movimiento');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <form onSubmit={guardar} className={`${cardClass} w-full max-w-md space-y-5 p-6`}>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Existencias de {producto.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Stock actual: <span className="font-bold text-slate-900 dark:text-white">{producto.stock}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'entrada', label: 'Entrada', descripcion: 'Compra o recepción' },
            { value: 'ajuste', label: 'Ajuste', descripcion: 'Corrección (puede restar)' },
          ].map(op => (
            <label key={op.value} className={`cursor-pointer rounded-lg border p-3 ${tipo === op.value ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950' : 'border-slate-200 dark:border-slate-700'}`}>
              <input type="radio" name="tipo" value={op.value} checked={tipo === op.value} onChange={() => setTipo(op.value)} className="sr-only" />
              <span className="block font-semibold text-slate-900 dark:text-white">{op.label}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{op.descripcion}</span>
            </label>
          ))}
        </div>

        <div>
          <label htmlFor="cantidad" className={labelClass}>
            {tipo === 'entrada' ? 'Cantidad a sumar' : 'Cantidad (negativa para restar)'}
          </label>
          <input
            id="cantidad" type="number" step="0.01" required
            min={tipo === 'entrada' ? '0.01' : undefined}
            value={cantidad} onChange={e => setCantidad(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="motivo" className={labelClass}>Motivo</label>
          <input id="motivo" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Factura de proveedor, conteo físico, merma..." className={inputClass} />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCerrar} className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancelar</button>
          <button type="submit" disabled={guardando} className={`${primaryButtonClass} w-auto px-5`}>
            {guardando ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
