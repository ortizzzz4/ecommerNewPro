import uuid
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from contacts.models import Contact
from invoices.models import Invoice, InvoiceItem
from products.models import Product
from inventario.services import StockError, descontar

from .models import CajaSesion, LineaVentaPos, PrinterProfile, VentaPos
from .ticket import construir_apertura_cajon, construir_prueba, construir_ticket
from .transport import enviar

DOCUMENTOS = ('ticket', 'factura', 'credito_fiscal')  # toda venta queda en Facturación
# En el POS solo se venden bienes y combos; servicios y kits no
PRODUCTOS_POS = ('bien', 'combo')


class PosError(Exception):
    pass


def _dinero(valor):
    return Decimal(valor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def nuevo_folio():
    return f'V{timezone.localtime():%Y%m%d%H%M%S}-{uuid.uuid4().hex[:4].upper()}'


def _validar_cliente(documento, cliente_id):
    cliente = None
    if cliente_id:
        cliente = Contact.objects.filter(pk=cliente_id).first()
        if cliente is None:
            raise PosError('El cliente no existe.')

    if documento == 'credito_fiscal':
        if cliente is None:
            raise PosError('Para crédito fiscal selecciona un cliente.')
        if not (cliente.nit and cliente.nrc):
            raise PosError('El cliente necesita NIT y NRC para emitir crédito fiscal.')
    return cliente


def _crear_factura(detalles, documento, cliente, descuento_pct, tasa):
    """La factura queda en Facturación ya cobrada, con el tipo de documento elegido."""
    factura = Invoice.objects.create(
        tipo_documento=documento,
        cliente=cliente,
        nombre_cliente=(cliente.nombre if cliente else 'Consumidor final')[:100],
        descuento=descuento_pct,
        impuesto=tasa,
        status='pagada',
    )
    InvoiceItem.objects.bulk_create([
        InvoiceItem(factura=factura, descripcion=d.descripcion, cantidad=d.cantidad, precio_unit=d.precio_unit)
        for d in detalles
    ])
    return factura


def crear_venta(cajero, lineas, metodo_pago, monto_recibido=None, descuento_pct=Decimal('0'),
                documento='ticket', cliente_id=None, caja=None):
    """lineas: [{'product_id': 1, 'quantity': 2}, ...]
    documento: 'ticket' (solo recibo), 'factura' o 'credito_fiscal' (genera factura en Facturación)."""
    if not lineas:
        raise PosError('La venta no tiene productos.')
    if metodo_pago not in dict(VentaPos.METODOS):
        raise PosError('Método de pago no válido.')
    if documento not in DOCUMENTOS:
        raise PosError('Tipo de documento no válido.')
    descuento_pct = Decimal(descuento_pct)
    if not 0 <= descuento_pct <= 100:
        raise PosError('El descuento debe estar entre 0 y 100%.')

    cliente = _validar_cliente(documento, cliente_id)

    # Si el mismo producto llega dos veces, se suman las cantidades
    cantidades = {}
    for linea in lineas:
        try:
            cantidad = int(linea['quantity'])
            producto_id = int(linea['product_id'])
        except (KeyError, TypeError, ValueError) as exc:
            raise PosError('Cada línea necesita product_id y quantity válidos.') from exc
        if cantidad <= 0:
            raise PosError('La cantidad debe ser mayor que cero.')
        cantidades[producto_id] = cantidades.get(producto_id, 0) + cantidad

    productos = Product.objects.in_bulk(list(cantidades))
    if len(productos) != len(cantidades):
        raise PosError('Hay productos que no existen.')
    for producto in productos.values():
        if not producto.visible_pos or producto.tipo not in PRODUCTOS_POS:
            raise PosError(f'"{producto.title}" no se puede vender en el punto de venta.')

    detalles = []
    subtotal = Decimal('0')
    for producto_id, cantidad in cantidades.items():
        producto = productos[producto_id]
        precio = Decimal(producto.price)
        subtotal += precio * cantidad
        detalles.append(LineaVentaPos(
            producto=producto, descripcion=producto.title,
            cantidad=cantidad, precio_unit=precio,
        ))

    tasa = Decimal(getattr(settings, 'POS_TASA_IVA', 13))
    subtotal = _dinero(subtotal)
    descuento = _dinero(subtotal * descuento_pct / 100)
    base = subtotal - descuento
    impuesto = _dinero(base * tasa / 100)
    total = base + impuesto

    if metodo_pago == 'efectivo':
        if monto_recibido in (None, ''):
            raise PosError('Indica el monto recibido en efectivo.')
        recibido = _dinero(monto_recibido)
        if recibido < total:
            raise PosError('El monto recibido es menor que el total.')
        cambio = recibido - total
    else:
        recibido = total
        cambio = Decimal('0.00')

    folio = nuevo_folio()
    with transaction.atomic():
        try:
            descontar(
                [(productos[pid], cantidad) for pid, cantidad in cantidades.items()],
                motivo='Venta en punto de venta', referencia=folio, usuario=cajero,
            )
        except StockError as exc:
            raise PosError(str(exc)) from exc

        venta = VentaPos.objects.create(
            folio=folio, cajero=cajero, caja=caja,
            subtotal=subtotal, descuento_pct=descuento_pct, descuento_monto=descuento,
            impuesto_pct=tasa, impuesto_monto=impuesto, total=total,
            metodo_pago=metodo_pago, monto_recibido=recibido, cambio=cambio,
        )
        for detalle in detalles:
            detalle.venta = venta
        LineaVentaPos.objects.bulk_create(detalles)

        # Toda venta se registra en Facturación: como ticket, factura o crédito fiscal
        venta.factura = _crear_factura(detalles, documento, cliente, descuento_pct, tasa)
        venta.save(update_fields=['factura'])

    return venta


def imprimir_venta(venta, impresora):
    enviar(impresora, construir_ticket(venta, impresora.ancho_papel, impresora.codepage))


def imprimir_prueba(impresora):
    enviar(impresora, construir_prueba(impresora.ancho_papel, impresora.codepage))


def abrir_cajon(impresora):
    enviar(impresora, construir_apertura_cajon())


def impresora_predeterminada():
    return PrinterProfile.objects.filter(predeterminada=True, activa=True).first()


def caja_abierta(usuario):
    return CajaSesion.objects.filter(cajero=usuario, cerrada__isnull=True).first()


# Billetes y monedas de dólar (en centavos)
DENOMINACIONES = [10000, 5000, 2000, 1000, 500, 100, 50, 25, 10, 5, 1]


def _etiqueta(centavos):
    return f'{centavos // 100}' if centavos % 100 == 0 else f'{centavos / 100:.2f}'


def total_desglose(desglose):
    """Suma billetes y monedas. desglose: {"20": 3, "0.25": 4}. Devuelve (total, desglose normalizado)."""
    if not desglose:
        return None, {}
    if not isinstance(desglose, dict):
        raise PosError('El conteo de efectivo no es válido.')
    permitidas = {_etiqueta(c): c for c in DENOMINACIONES}
    normalizado = {}
    centavos_total = 0
    for etiqueta, cantidad in desglose.items():
        if str(etiqueta) not in permitidas:
            raise PosError(f'Denominación no válida: {etiqueta}.')
        try:
            cantidad = int(cantidad or 0)
        except (TypeError, ValueError) as exc:
            raise PosError('Las cantidades deben ser números enteros.') from exc
        if cantidad < 0:
            raise PosError('Las cantidades no pueden ser negativas.')
        if cantidad:
            normalizado[_etiqueta(permitidas[str(etiqueta)])] = cantidad
            centavos_total += permitidas[str(etiqueta)] * cantidad
    return _dinero(Decimal(centavos_total) / 100), normalizado


def abrir_caja(usuario, monto_inicial=None, desglose=None):
    if caja_abierta(usuario):
        raise PosError('Ya tienes una caja abierta.')
    total, conteo = total_desglose(desglose)
    if total is None:
        try:
            total = _dinero(monto_inicial or 0)
        except Exception as exc:
            raise PosError('El monto inicial no es válido.') from exc
    if total < 0:
        raise PosError('El monto inicial no puede ser negativo.')
    return CajaSesion.objects.create(cajero=usuario, monto_inicial=total, desglose_inicial=conteo)


def cerrar_caja(caja, monto_contado=None, desglose=None):
    """Concilia: efectivo esperado = monto inicial + ventas en efectivo. La diferencia es lo contado menos lo esperado."""
    if caja.cerrada is not None:
        raise PosError('Esta caja ya está cerrada.')
    total, conteo = total_desglose(desglose)
    if total is None:
        try:
            total = _dinero(monto_contado or 0)
        except Exception as exc:
            raise PosError('El efectivo contado no es válido.') from exc
    contado = total
    caja.desglose_contado = conteo

    ventas = caja.ventas.all()

    def total(metodo):
        return sum((v.total for v in ventas if v.metodo_pago == metodo), Decimal('0'))

    efectivo = total('efectivo')
    caja.total_efectivo = _dinero(efectivo)
    caja.total_tarjeta = _dinero(total('tarjeta'))
    caja.total_transferencia = _dinero(total('transferencia'))
    caja.esperado_efectivo = _dinero(caja.monto_inicial + efectivo)
    caja.monto_contado = contado
    caja.diferencia = contado - caja.esperado_efectivo
    caja.cerrada = timezone.now()
    caja.save()
    return caja
