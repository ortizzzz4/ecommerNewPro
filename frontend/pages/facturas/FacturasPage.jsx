import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const TIPO_DOC_ETIQUETA = { ticket: 'Ticket', factura: 'Factura', credito_fiscal: 'Crédito fiscal' };
const TIPO_DOC_COLOR = {
  ticket: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  factura: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  credito_fiscal: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};
import {
  getFacturas, facturarDesdeCoti,
  marcarFacturaPagada, anularFactura,
  getCotizaciones
} from '../../api/ApisCrud';

const STATUS_COLORS = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  pagada:    'bg-green-100 text-green-700',
  anulada:   'bg-red-100 text-red-700',
  vencida:   'bg-gray-100 text-gray-600',
};

export function FacturasPage() {
  const [facturas, setFacturas]                   = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [modal, setModal]                         = useState(false);
  const [cotizacionesAprobadas, setCotizaciones]  = useState([]);
  const [searchParams]                            = useSearchParams();
  const navigate = useNavigate();

  const [formFactura, setFormFactura] = useState({
    cotizacion_id: searchParams.get('cotizacion') || '',
    impuesto: 13,
    fecha_vence: '',
    nota: '',
  });
  const [errorModal, setErrorModal]     = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await getFacturas();
      setFacturas(res.data);
    } finally {
      setLoading(false);
    }
  };

  const cargarCotizaciones = async () => {
    try {
      const res = await getCotizaciones();
      // Solo aprobadas que aún no tienen factura
      setCotizaciones(res.data.filter(c => c.status === 'aprobada' && !c.factura));
    } catch {
      setCotizaciones([]);
    }
  };

  useEffect(() => {
    cargar();
    cargarCotizaciones();
    if (searchParams.get('cotizacion')) setModal(true);
  }, []);

  const abrirModal = () => {
    setFormFactura({ cotizacion_id: '', impuesto: 13, fecha_vence: '', nota: '' });
    setErrorModal(null);
    cargarCotizaciones(); // refresca la lista al abrir
    setModal(true);
  };

  const handleFacturar = async e => {
    e.preventDefault();
    setLoadingModal(true);
    setErrorModal(null);
    try {
      await facturarDesdeCoti({
        cotizacion_id: parseInt(formFactura.cotizacion_id),
        impuesto:      parseFloat(formFactura.impuesto),
        fecha_vence:   formFactura.fecha_vence || undefined,
        nota:          formFactura.nota,
      });
      setModal(false);
      cargar();
      cargarCotizaciones();
    } catch (err) {
      const data = err.response?.data;
      setErrorModal(data?.error || JSON.stringify(data) || 'Error al facturar');
    } finally {
      setLoadingModal(false);
    }
  };

  const handlePagar = async (id) => {
    if (!confirm('¿Marcar esta factura como pagada?')) return;
    try { await marcarFacturaPagada(id); cargar(); }
    catch { alert('No se pudo actualizar'); }
  };

  const handleAnular = async (id) => {
    if (!confirm('¿Anular esta factura? Esta acción no se puede deshacer.')) return;
    try { await anularFactura(id); cargar(); }
    catch (err) { alert(err.response?.data?.error || 'No se pudo anular'); }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">🧾 Facturas</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{facturas.length} facturas</p>
        </div>
        <button
          onClick={abrirModal}
          className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          🧾 Facturar desde Cotización
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">N° Factura</th>
                <th className="px-6 py-3 text-left">Documento</th>
                <th className="px-6 py-3 text-left">Cliente</th>
                <th className="px-6 py-3 text-left">Estado</th>
                <th className="px-6 py-3 text-right">Subtotal</th>
                <th className="px-6 py-3 text-right">IVA</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3 text-left">Emisión</th>
                <th className="px-6 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    No hay facturas aún
                  </td>
                </tr>
              ) : facturas.map(f => (
                <tr key={f.id} onClick={() => navigate(`/facturas/${f.id}`)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-gray-800 dark:text-white">
                    {f.numero}
                    {f.estado_fe && f.estado_fe !== 'no_aplica' && (
                      <span className="mt-1 block text-[11px] font-normal text-emerald-700 dark:text-emerald-400" title="Número de control del DTE">
                        FE {f.numero_control}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${TIPO_DOC_COLOR[f.tipo_documento] || TIPO_DOC_COLOR.factura}`}>
                      {TIPO_DOC_ETIQUETA[f.tipo_documento] || 'Factura'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                    {f.nombre_cliente || `Cliente #${f.cliente}`}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[f.status]}`}>
                      {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">
                    ${parseFloat(f.subtotal).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">
                    ${parseFloat(f.impuesto_monto).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-white">
                    ${parseFloat(f.total).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{f.fecha_emision}</td>
                  <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2">
                      {f.status === 'pendiente' && (
                        <>
                          <button onClick={() => handlePagar(f.id)} className="text-green-600 hover:text-green-800 font-medium">
                            💰 Pagar
                          </button>
                          <button onClick={() => handleAnular(f.id)} className="text-red-500 hover:text-red-700 font-medium">
                            🚫 Anular
                          </button>
                        </>
                      )}
                      {f.status === 'pagada'  && <span className="text-green-600 font-medium">✅ Pagada</span>}
                      {f.status === 'anulada' && <span className="text-red-500 font-medium">🚫 Anulada</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">🧾 Generar Factura</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleFacturar} className="p-6 space-y-4">
              {errorModal && (
                <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg text-sm">{errorModal}</div>
              )}

              {/* Select de cotizaciones aprobadas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cotización <span className="text-red-500">*</span>
                </label>
                <select
                  value={formFactura.cotizacion_id}
                  onChange={e => setFormFactura(p => ({ ...p, cotizacion_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">— Seleccionar cotización aprobada —</option>
                  {cotizacionesAprobadas.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} — Cliente #{c.cliente} — ${parseFloat(c.total).toFixed(2)}
                    </option>
                  ))}
                </select>
                {cotizacionesAprobadas.length === 0 && (
                  <p className="text-xs text-yellow-500 mt-1">
                    No hay cotizaciones aprobadas pendientes de facturar
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IVA (%)</label>
                <input
                  type="number"
                  value={formFactura.impuesto}
                  onChange={e => setFormFactura(p => ({ ...p, impuesto: e.target.value }))}
                  min="0" max="100" step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Vencimiento</label>
                <input
                  type="date"
                  value={formFactura.fecha_vence}
                  onChange={e => setFormFactura(p => ({ ...p, fecha_vence: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nota</label>
                <textarea
                  value={formFactura.nota}
                  onChange={e => setFormFactura(p => ({ ...p, nota: e.target.value }))}
                  rows={2}
                  placeholder="Observaciones..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingModal || cotizacionesAprobadas.length === 0}
                  className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg font-medium transition-colors"
                >
                  {loadingModal ? 'Generando...' : 'Generar Factura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
