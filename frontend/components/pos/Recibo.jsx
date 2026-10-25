import { formatPrice } from '../../utils/format';

const METODOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };

// Vista previa del ticket. Se imprime con window.print() gracias a los estilos #recibo-impresion en index.css
export function Recibo({ venta }) {
  const fecha = new Date(venta.creada).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div id="recibo-impresion" className="mx-auto w-full max-w-[80mm] bg-white p-4 font-mono text-[12px] leading-snug text-black">
      <p className="text-center text-base font-bold">ORTIZ</p>
      <p className="text-center">Ticket de venta</p>
      <p className="mt-2">Folio: {venta.folio}</p>
      {venta.factura && (
        <p className="font-bold">
          {{ ticket: 'TICKET', factura: 'FACTURA', credito_fiscal: 'CRÉDITO FISCAL' }[venta.factura.tipo_documento] || 'DOCUMENTO'} No. {venta.factura.numero}
        </p>
      )}
      <p>Fecha: {fecha}</p>
      {venta.cajero && <p>Cajero: {venta.cajero}</p>}

      <hr className="my-2 border-dashed border-black" />

      {venta.lineas.map((linea, i) => (
        <div key={i} className="mb-1">
          <p>{linea.cantidad} x {linea.descripcion}</p>
          <div className="flex justify-between">
            <span>&nbsp;&nbsp;&nbsp;{formatPrice(linea.precio_unit)}</span>
            <span>{formatPrice(linea.total_linea)}</span>
          </div>
        </div>
      ))}

      <hr className="my-2 border-dashed border-black" />

      <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(venta.subtotal)}</span></div>
      {Number(venta.descuento_monto) > 0 && (
        <div className="flex justify-between">
          <span>Descuento ({venta.descuento_pct}%)</span><span>-{formatPrice(venta.descuento_monto)}</span>
        </div>
      )}
      <div className="flex justify-between"><span>IVA ({venta.impuesto_pct}%)</span><span>{formatPrice(venta.impuesto_monto)}</span></div>

      <hr className="my-2 border-dashed border-black" />

      <div className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{formatPrice(venta.total)}</span></div>

      <hr className="my-2 border-dashed border-black" />

      <div className="flex justify-between"><span>Pago</span><span>{METODOS[venta.metodo_pago] || venta.metodo_pago}</span></div>
      {venta.metodo_pago === 'efectivo' && (
        <>
          <div className="flex justify-between"><span>Recibido</span><span>{formatPrice(venta.monto_recibido)}</span></div>
          <div className="flex justify-between"><span>Cambio</span><span>{formatPrice(venta.cambio)}</span></div>
        </>
      )}

      <p className="mt-3 text-center">Gracias por su compra</p>
    </div>
  );
}
