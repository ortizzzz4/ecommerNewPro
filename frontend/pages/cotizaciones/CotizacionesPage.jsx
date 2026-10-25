import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCotizaciones, deleteCotizacion, patchCotizacion } from '../../api/ApisCrud';

const STATUS_COLORS = {
  borrador:  'bg-gray-100 text-gray-700',
  enviada:   'bg-blue-100 text-blue-700',
  aprobada:  'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
  vencida:   'bg-yellow-100 text-yellow-700',
};

const STATUS_LABELS = {
  borrador:  'Borrador',
  enviada:   'Enviada',
  aprobada:  'Aprobada',
  rechazada: 'Rechazada',
  vencida:   'Vencida',
};

export function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await getCotizaciones();
      setCotizaciones(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const cambiarEstado = async (id, status) => {
    try {
      await patchCotizacion(id, { status });
      cargar();
    } catch {
      alert('No se pudo cambiar el estado');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar cotización?')) return;
    try {
      await deleteCotizacion(id);
      cargar();
    } catch {
      alert('No se pudo eliminar');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">📝 Cotizaciones</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{cotizaciones.length} cotizaciones</p>
        </div>
        <Link
          to="/cotizaciones/crear"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          ➕ Nueva Cotización
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Código</th>
                <th className="px-6 py-3 text-left">Cliente</th>
                <th className="px-6 py-3 text-left">Estado</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3 text-left">Válida hasta</th>
                <th className="px-6 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {cotizaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No hay cotizaciones aún
                  </td>
                </tr>
              ) : cotizaciones.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-gray-800 dark:text-white">
                    {c.codigo}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                    {c.nombre_cliente || `Cliente #${c.cliente}`}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-800 dark:text-white">
                    ${parseFloat(c.total).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                    {c.valida_hasta || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      <Link
                        to={`/cotizaciones/${c.id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        👁️ Ver
                      </Link>
                      {c.status === 'borrador' && (
                        <>
                          <Link
                            to={`/cotizaciones/editar/${c.id}`}
                            className="text-yellow-600 hover:text-yellow-800 font-medium"
                          >
                            ✏️ Editar
                          </Link>
                          <button
                            onClick={() => cambiarEstado(c.id, 'enviada')}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            📤 Enviar
                          </button>
                        </>
                      )}
                      {c.status === 'enviada' && (
                        <>
                          <button
                            onClick={() => cambiarEstado(c.id, 'aprobada')}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            ✅ Aprobar
                          </button>
                          <button
                            onClick={() => cambiarEstado(c.id, 'rechazada')}
                            className="text-red-500 hover:text-red-700 font-medium"
                          >
                            ❌ Rechazar
                          </button>
                        </>
                      )}
                      {c.status === 'aprobada' && !c.factura && (
                        <button
                          onClick={() => navigate(`/facturas/crear?cotizacion=${c.id}`)}
                          className="text-orange-600 hover:text-orange-800 font-medium"
                        >
                          🧾 Facturar
                        </button>
                      )}
                      {c.status === 'borrador' && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-red-500 hover:text-red-700 font-medium"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
