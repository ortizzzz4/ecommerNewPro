import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createCotizacion, getCotizacion, updateCotizacion,
  getClientes, getProducts
} from '../../api/ApisCrud';

export function CotizacionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [clientes, setClientes]   = useState([]);
  const [productos, setProductos] = useState([]);

  const [form, setForm] = useState({
    cliente: '',
    nombre_cliente: '',
    status: 'borrador',
    descuento: 0,
    nota: '',
    valida_hasta: '',
    items: [],
  });

  useEffect(() => {
    getClientes().then(r => setClientes(r.data));
    getProducts({ canal: 'ventas' }).then(r => setProductos(r.data));
    if (isEdit) {
      getCotizacion(id).then(r => setForm(r.data));
    }
  }, [id]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // ── Items ──────────────────────────────────────────
  const agregarItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { producto: '', cantidad: 1, precio_unit: '' }]
    }));
  };

  const eliminarItem = (index) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };

      // Auto-completa precio cuando selecciona producto
      if (field === 'producto') {
        const prod = productos.find(p => p.id === parseInt(value));
        if (prod) items[index].precio_unit = prod.price;
      }
      return { ...prev, items };
    });
  };

  // ── Cálculos ───────────────────────────────────────
  const subtotal = form.items.reduce((acc, item) => {
    return acc + (parseFloat(item.cantidad || 0) * parseFloat(item.precio_unit || 0));
  }, 0);
  const descuentoMonto = subtotal * (parseFloat(form.descuento || 0) / 100);
  const total = subtotal - descuentoMonto;

  // ── Submit ─────────────────────────────────────────
  const handleSubmit = async e => {
    e.preventDefault();
    if (form.items.length === 0) {
      setError('Debes agregar al menos un producto');
      return;
    }
    setLoading(true);
    setError(null);

    const payload = {
      ...form,
      cliente: form.cliente || null,
      items: form.items.map(item => ({
        producto:    parseInt(item.producto),
        cantidad:    parseInt(item.cantidad),
        precio_unit: parseFloat(item.precio_unit),
      }))
    };

    try {
      if (isEdit) {
        await updateCotizacion(id, payload);
      } else {
        await createCotizacion(payload);
      }
      navigate('/cotizaciones');
    } catch (err) {
      const data = err.response?.data;
      setError(data ? JSON.stringify(data) : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mb-2">
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          {isEdit ? '✏️ Editar Cotización' : '📝 Nueva Cotización'}
        </h1>
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Cliente */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-white mb-4">Cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cliente registrado
              </label>
              <select
                name="cliente"
                value={form.cliente || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Seleccionar cliente —</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                O escribir nombre del cliente
              </label>
              <input
                type="text"
                name="nombre_cliente"
                value={form.nombre_cliente}
                onChange={handleChange}
                placeholder="Nombre si no está registrado"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Válida hasta
              </label>
              <input
                type="date"
                name="valida_hasta"
                value={form.valida_hasta}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descuento (%)
              </label>
              <input
                type="number"
                name="descuento"
                value={form.descuento}
                onChange={handleChange}
                min="0" max="100" step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-white">Productos</h2>
            <button
              type="button"
              onClick={agregarItem}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              ➕ Agregar producto
            </button>
          </div>

          {form.items.length === 0 ? (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              No hay productos. Haz clic en "Agregar producto".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                  <tr>
                    <th className="py-2 text-left">Producto</th>
                    <th className="py-2 text-center w-24">Cantidad</th>
                    <th className="py-2 text-right w-32">Precio Unit.</th>
                    <th className="py-2 text-right w-32">Total</th>
                    <th className="py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, index) => (
                    <tr key={index} className="border-b dark:border-gray-700">
                      <td className="py-3 pr-3">
                        <select
                          value={item.producto}
                          onChange={e => handleItemChange(index, 'producto', e.target.value)}
                          required
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">— Seleccionar —</option>
                          {productos.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          value={item.cantidad}
                          onChange={e => handleItemChange(index, 'cantidad', e.target.value)}
                          min="1"
                          required
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          value={item.precio_unit}
                          onChange={e => handleItemChange(index, 'precio_unit', e.target.value)}
                          min="0" step="0.01"
                          required
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-3 pl-2 text-right font-medium text-gray-800 dark:text-white">
                        ${(parseFloat(item.cantidad || 0) * parseFloat(item.precio_unit || 0)).toFixed(2)}
                      </td>
                      <td className="py-3 pl-2">
                        <button
                          type="button"
                          onClick={() => eliminarItem(index)}
                          className="text-red-500 hover:text-red-700 text-lg"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totales */}
          {form.items.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {parseFloat(form.descuento) > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Descuento ({form.descuento}%):</span>
                    <span>-${descuentoMonto.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-gray-800 dark:text-white border-t dark:border-gray-700 pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Nota */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-white mb-3">Nota</h2>
          <textarea
            name="nota"
            value={form.nota}
            onChange={handleChange}
            rows={3}
            placeholder="Condiciones, observaciones..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Botones */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Cotización'}
          </button>
        </div>
      </form>
    </div>
  );
}
