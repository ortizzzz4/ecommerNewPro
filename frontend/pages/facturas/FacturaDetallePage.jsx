import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getFactura } from '../../api/ApisCrud';
import { formatPrice } from '../../utils/format';
import { cardClass, invoiceStatusLabels, statusBadgeClass } from '../../utils/ui';

const TIPO_ETIQUETA = { ticket: 'Ticket', factura: 'Factura', credito_fiscal: 'Crédito fiscal' };

function Dato({ etiqueta, valor, mono = false }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{etiqueta}</dt>
      <dd className={`mt-1 text-slate-900 dark:text-white ${mono ? 'break-all font-mono text-sm' : ''}`}>{valor || '—'}</dd>
    </div>
  );
}

// Vista completa de una factura: encabezado, líneas y totales
export function FacturaDetallePage() {
  const { id } = useParams();
  const [factura, setFactura] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getFactura(id)
      .then(res => setFactura(res.data))
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-600 dark:text-slate-300">No se encontró la factura.</p>
        <Link to="/facturas" className="mt-4 inline-block font-semibold text-indigo-600 hover:underline">Volver a facturación</Link>
      </div>
    );
  }

  if (!factura) {
    return <p className="animate-pulse py-20 text-center text-slate-500">Cargando factura...</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/facturas" className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">← Volver a facturación</Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {TIPO_ETIQUETA[factura.tipo_documento] || 'Factura'} <span className="font-mono">{factura.numero}</span>
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Emitida el {factura.fecha_emision}</p>
        </div>
        <span className={statusBadgeClass(factura.status)}>{invoiceStatusLabels[factura.status] || factura.status}</span>
      </header>

      <section className={`${cardClass} p-6`}>
        <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">Encabezado</h2>
        <dl className="grid gap-5 sm:grid-cols-3">
          <Dato etiqueta="Cliente" valor={factura.nombre_cliente || (factura.cliente ? `Cliente #${factura.cliente}` : 'Consumidor final')} />
          <Dato etiqueta="Tipo de documento" valor={TIPO_ETIQUETA[factura.tipo_documento]} />
          <Dato etiqueta="Fecha de emisión" valor={factura.fecha_emision} />
          <Dato etiqueta="Fecha de vencimiento" valor={factura.fecha_vence} />
          <Dato etiqueta="Descuento" valor={`${factura.descuento}%`} />
          <Dato etiqueta="IVA" valor={`${factura.impuesto}%`} />
          {factura.estado_fe && factura.estado_fe !== 'no_aplica' && (
            <>
              <Dato etiqueta="Número de control (DTE)" valor={factura.numero_control} mono />
              <Dato etiqueta="Código de generación" valor={factura.codigo_generacion} mono />
              <Dato etiqueta="Estado electrónico" valor={factura.estado_fe} />
            </>
          )}
          {factura.nota && (
            <div className="sm:col-span-3">
              <Dato etiqueta="Nota" valor={factura.nota} />
            </div>
          )}
        </dl>
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        <h2 className="border-b border-slate-200 px-6 py-4 font-semibold text-slate-900 dark:border-slate-800 dark:text-white">Líneas</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3">Descripción</th>
                <th className="px-6 py-3 text-right">Cantidad</th>
                <th className="px-6 py-3 text-right">Precio</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {factura.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500">Esta factura no tiene líneas.</td>
                </tr>
              ) : factura.items.map(item => (
                <tr key={item.id}>
                  <td className="px-6 py-3 text-slate-900 dark:text-white">{item.descripcion}</td>
                  <td className="px-6 py-3 text-right text-slate-600 dark:text-slate-300">{item.cantidad}</td>
                  <td className="px-6 py-3 text-right text-slate-600 dark:text-slate-300">{formatPrice(item.precio_unit)}</td>
                  <td className="px-6 py-3 text-right font-semibold text-slate-900 dark:text-white">{formatPrice(item.total_linea)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto max-w-sm space-y-2 border-t border-slate-200 px-6 py-5 text-sm dark:border-slate-800">
          <div className="flex justify-between text-slate-600 dark:text-slate-300"><dt>Subtotal</dt><dd>{formatPrice(factura.subtotal)}</dd></div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300"><dt>Descuento</dt><dd>-{formatPrice(factura.descuento_monto)}</dd></div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300"><dt>Base imponible</dt><dd>{formatPrice(factura.base_imponible)}</dd></div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300"><dt>IVA</dt><dd>{formatPrice(factura.impuesto_monto)}</dd></div>
          <div className="flex justify-between pt-2 text-lg font-bold text-slate-900 dark:text-white"><dt>Total</dt><dd>{formatPrice(factura.total)}</dd></div>
        </dl>
      </section>
    </div>
  );
}
