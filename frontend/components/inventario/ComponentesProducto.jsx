import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getComponentes, getProducts, setComponentes } from '../../api/ApisCrud';
import { toList } from '../../utils/data';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../utils/ui';

// Define qué productos forman un combo o kit
export function ComponentesProducto({ producto, onCerrar, onGuardado }) {
  const [disponibles, setDisponibles] = useState([]);
  const [lineas, setLineas] = useState(null);
  const [nuevoId, setNuevoId] = useState('');
  const [nuevaCantidad, setNuevaCantidad] = useState('1');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getProducts().then(res => setDisponibles(toList(res.data).filter(p => p.id !== producto.id)));
    getComponentes(producto.id)
      .then(res => setLineas(res.data))
      .catch(() => setLineas([]));
  }, [producto.id]);

  const agregar = () => {
    const componente = disponibles.find(p => String(p.id) === String(nuevoId));
    if (!componente || Number(nuevaCantidad) <= 0) return;
    setLineas(prev => {
      const sinRepetir = prev.filter(l => l.componente_id !== componente.id);
      return [...sinRepetir, { componente_id: componente.id, nombre: componente.title, cantidad: nuevaCantidad }];
    });
    setNuevoId('');
    setNuevaCantidad('1');
  };

  const quitar = (componenteId) => setLineas(prev => prev.filter(l => l.componente_id !== componenteId));

  const guardar = async () => {
    setGuardando(true);
    try {
      await setComponentes(producto.id, lineas.map(l => ({ componente_id: l.componente_id, cantidad: l.cantidad })));
      toast.success('Componentes guardados');
      onGuardado();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudieron guardar los componentes');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className={`${cardClass} w-full max-w-lg space-y-5 p-6`}>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Componentes de {producto.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Al vender este {producto.tipo === 'combo' ? 'combo' : 'kit'} se descuentan estos productos del inventario.
          </p>
        </div>

        {lineas === null ? (
          <p className="animate-pulse text-sm text-slate-500">Cargando...</p>
        ) : lineas.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:bg-slate-800/60">Todavía no tiene componentes.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
            {lineas.map(linea => (
              <li key={linea.componente_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-slate-800 dark:text-slate-200">{linea.nombre}</span>
                <span className="flex items-center gap-4">
                  <span className="font-semibold text-slate-900 dark:text-white">× {linea.cantidad}</span>
                  <button onClick={() => quitar(linea.componente_id)} className="text-xs font-semibold text-red-600 hover:underline">Quitar</button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_6rem_auto]">
          <div>
            <label htmlFor="componente" className={labelClass}>Agregar producto</label>
            <select id="componente" value={nuevoId} onChange={e => setNuevoId(e.target.value)} className={inputClass}>
              <option value="">Selecciona...</option>
              {disponibles.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cantidad-componente" className={labelClass}>Cantidad</label>
            <input id="cantidad-componente" type="number" min="0.01" step="0.01" value={nuevaCantidad} onChange={e => setNuevaCantidad(e.target.value)} className={inputClass} />
          </div>
          <div className="flex items-end">
            <button onClick={agregar} disabled={!nuevoId} className="w-full rounded-lg border border-indigo-600 px-4 py-2.5 font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 dark:text-indigo-400 dark:hover:bg-indigo-950">
              Agregar
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onCerrar} className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancelar</button>
          <button onClick={guardar} disabled={guardando || !lineas?.length} className={`${primaryButtonClass} w-auto px-5`}>
            {guardando ? 'Guardando...' : 'Guardar componentes'}
          </button>
        </div>
      </div>
    </div>
  );
}
