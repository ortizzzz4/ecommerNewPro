from decimal import Decimal

from django.conf import settings
from django.utils import timezone

from empresa.models import Empresa

from .escpos import DRAWER_KICK, INIT, Ticket
from .models import VentaPos


def dinero(valor):
    return f'${Decimal(valor):.2f}'


def construir_ticket(venta, ancho_papel=80, codepage='cp858'):
    """Arma los bytes ESC/POS de una venta, listos para enviar a la impresora."""
    empresa = Empresa.obtener()
    negocio = empresa.nombre_comercial or getattr(settings, 'POS_NOMBRE_NEGOCIO', 'Ortiz')
    metodos = dict(VentaPos.METODOS)

    t = Ticket(ancho_papel, codepage)
    t.linea(negocio, align='center', bold=True, double=True)
    t.linea('Ticket de venta', align='center')
    t.linea('')
    t.linea(f'Folio: {venta.folio}')
    t.linea(f'Fecha: {timezone.localtime(venta.creada):%d/%m/%Y %H:%M}')
    if venta.cajero:
        t.linea(f'Cajero: {venta.cajero.username}')
    if venta.factura:
        etiquetas = {'ticket': 'TICKET', 'factura': 'FACTURA', 'credito_fiscal': 'CREDITO FISCAL'}
        etiqueta = etiquetas.get(venta.factura.tipo_documento, 'DOCUMENTO')
        t.linea(f'{etiqueta} No. {venta.factura.numero}', bold=True)
        cliente = venta.factura.cliente
        if cliente and venta.factura.tipo_documento == 'credito_fiscal':
            t.linea(f'Cliente: {cliente.nombre}')
            t.linea(f'NIT: {cliente.nit}  NRC: {cliente.nrc}')
    t.separador()

    for linea in venta.lineas.all():
        t.linea(f'{linea.cantidad} x {linea.descripcion}')
        t.par(f'   {dinero(linea.precio_unit)}', dinero(linea.total_linea))

    t.separador()
    t.par('Subtotal', dinero(venta.subtotal))
    if venta.descuento_monto:
        t.par(f'Descuento ({venta.descuento_pct}%)', f'-{dinero(venta.descuento_monto)}')
    t.par(f'IVA ({venta.impuesto_pct}%)', dinero(venta.impuesto_monto))
    t.separador()
    t.par('TOTAL', dinero(venta.total), bold=True)
    t.separador()

    t.par('Pago', metodos.get(venta.metodo_pago, venta.metodo_pago))
    if venta.metodo_pago == 'efectivo':
        t.par('Recibido', dinero(venta.monto_recibido))
        t.par('Cambio', dinero(venta.cambio))

    t.linea('')
    t.linea(empresa.pie_ticket or 'Gracias por su compra', align='center')
    t.cortar()
    return t.bytes()


def construir_prueba(ancho_papel=80, codepage='cp858'):
    t = Ticket(ancho_papel, codepage)
    t.linea('PRUEBA DE IMPRESORA', align='center', bold=True)
    t.linea('Si puedes leer esto, la impresora esta configurada.', align='center')
    t.cortar()
    return t.bytes()


def construir_apertura_cajon():
    return INIT + DRAWER_KICK


def construir_cierre(caja, ancho_papel=80, codepage='cp858'):
    """Ticket de cierre de caja con el resumen y la conciliación del efectivo."""
    t = Ticket(ancho_papel, codepage)
    t.linea('CIERRE DE CAJA', align='center', bold=True, double=True)
    t.linea(f'Caja {caja.id}', align='center')
    t.linea(f'Cajero: {caja.cajero.username if caja.cajero else "-"}')
    t.linea(f'Apertura: {timezone.localtime(caja.abierta):%d/%m/%Y %H:%M}')
    t.linea(f'Cierre: {timezone.localtime(caja.cerrada):%d/%m/%Y %H:%M}')
    t.separador()
    t.par('Monto inicial', dinero(caja.monto_inicial))
    t.par('Ventas efectivo', dinero(caja.total_efectivo))
    t.par('Ventas tarjeta', dinero(caja.total_tarjeta))
    t.par('Ventas transferencia', dinero(caja.total_transferencia))
    t.separador()
    t.par('Efectivo esperado', dinero(caja.esperado_efectivo))
    t.par('Efectivo contado', dinero(caja.monto_contado))
    t.par('Diferencia', dinero(caja.diferencia), bold=True)
    t.linea('')
    t.linea('Firma: ________________________', align='center')
    t.cortar()
    return t.bytes()
