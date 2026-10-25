from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from products.models import Product

from .models import Compra, CompraLinea, ComponenteProducto, MovimientoInventario, Recepcion, RecepcionLinea


class StockError(Exception):
    pass


class CompraError(Exception):
    pass


class RecepcionError(Exception):
    pass


def _acumular_bienes(producto, cantidad, acumulado):
    """Reparte la venta de un producto en los bienes que realmente salen del almacén."""
    if producto.tipo in ('combo', 'kit'):
        componentes = list(ComponenteProducto.objects.select_related('componente').filter(padre=producto))
        if not componentes:
            raise StockError(f'"{producto.title}" no tiene componentes configurados.')
        for componente in componentes:
            _acumular_bienes(componente.componente, cantidad * componente.cantidad, acumulado)
    elif producto.tipo == 'bien':
        _, actual = acumulado.get(producto.id, (producto, Decimal('0')))
        acumulado[producto.id] = (producto, actual + Decimal(cantidad))
    # Los servicios no descuentan inventario
    return acumulado


def descontar(lineas, motivo, referencia='', usuario=None):
    """lineas: [(producto, cantidad), ...]. Todo o nada: si falta stock de algún bien, no se descuenta nada."""
    acumulado = {}
    for producto, cantidad in lineas:
        _acumular_bienes(producto, cantidad, acumulado)
    if not acumulado:
        return

    with transaction.atomic():
        bloqueados = Product.objects.select_for_update().in_bulk(list(acumulado))
        for producto_id, (_, cantidad) in acumulado.items():
            actual = bloqueados[producto_id]
            if actual.stock < cantidad:
                raise StockError(
                    f'Stock insuficiente de "{actual.title}": hay {actual.stock} y se necesitan {cantidad}.'
                )
        for producto_id, (_, cantidad) in acumulado.items():
            actual = bloqueados[producto_id]
            actual.stock -= cantidad
            actual.save(update_fields=['stock'])
            MovimientoInventario.objects.create(
                producto=actual, tipo='venta', cantidad=-cantidad,
                motivo=motivo, referencia=referencia, usuario=usuario,
            )


def registrar_movimiento(producto, tipo, cantidad, motivo='', usuario=None, referencia=''):
    """Entradas suman; ajustes pueden ser positivos o negativos."""
    cantidad = Decimal(cantidad)
    if tipo == 'entrada' and cantidad <= 0:
        raise StockError('La entrada debe tener una cantidad mayor que cero.')
    if not producto.descuenta_inventario:
        raise StockError('Solo los bienes tienen existencias.')

    with transaction.atomic():
        bloqueado = Product.objects.select_for_update().get(pk=producto.pk)
        if bloqueado.stock + cantidad < 0:
            raise StockError(f'El ajuste dejaría "{bloqueado.title}" con stock negativo.')
        bloqueado.stock += cantidad
        bloqueado.save(update_fields=['stock'])
        return MovimientoInventario.objects.create(
            producto=bloqueado, tipo=tipo, cantidad=cantidad, motivo=motivo, referencia=referencia, usuario=usuario,
        )


def crear_compra(proveedor, lineas, usuario=None, notas=''):
    """lineas: [(producto, cantidad, costo_unitario), ...]. Crea la compra y su recepción pendiente."""
    if not lineas:
        raise CompraError('La compra debe tener al menos un producto.')
    for producto, cantidad, costo in lineas:
        if not producto.descuenta_inventario:
            raise CompraError(f'"{producto.title}" no es un bien: solo los bienes se reciben en inventario.')
        if cantidad <= 0:
            raise CompraError(f'La cantidad de "{producto.title}" debe ser mayor que cero.')
        if costo < 0:
            raise CompraError(f'El costo de "{producto.title}" no puede ser negativo.')

    with transaction.atomic():
        compra = Compra.objects.create(proveedor=proveedor, notas=notas, usuario=usuario)
        CompraLinea.objects.bulk_create([
            CompraLinea(compra=compra, producto=producto, cantidad=cantidad, costo_unitario=costo)
            for producto, cantidad, costo in lineas
        ])
        recepcion = Recepcion.objects.create(compra=compra)
        RecepcionLinea.objects.bulk_create([
            RecepcionLinea(recepcion=recepcion, producto=producto, cantidad_esperada=cantidad)
            for producto, cantidad, _ in lineas
        ])
    return compra


def confirmar_recepcion(recepcion, cantidades_recibidas=None, usuario=None):
    """Ingresa las existencias de una recepción pendiente.

    cantidades_recibidas: {linea_id: cantidad}. Las líneas que no aparecen se reciben por lo esperado.
    """
    cantidades_recibidas = cantidades_recibidas or {}
    with transaction.atomic():
        bloqueada = Recepcion.objects.select_for_update().select_related('compra').get(pk=recepcion.pk)
        if bloqueada.estado != 'pendiente':
            raise RecepcionError('Esta recepción ya fue confirmada.')

        lineas = list(bloqueada.lineas.select_related('producto'))
        for linea in lineas:
            recibida = Decimal(str(cantidades_recibidas.get(linea.pk, linea.cantidad_esperada)))
            if recibida < 0:
                raise RecepcionError(f'La cantidad recibida de "{linea.producto.title}" no puede ser negativa.')
            linea.cantidad_recibida = recibida
            linea.save(update_fields=['cantidad_recibida'])

        for linea in lineas:
            if linea.cantidad_recibida > 0:
                registrar_movimiento(
                    linea.producto, 'entrada', linea.cantidad_recibida,
                    motivo=f'Recepción de compra #{bloqueada.compra_id}',
                    usuario=usuario, referencia=f'Compra #{bloqueada.compra_id}',
                )

        bloqueada.estado = 'recibida'
        bloqueada.recibida_en = timezone.now()
        bloqueada.recibida_por = usuario
        bloqueada.save(update_fields=['estado', 'recibida_en', 'recibida_por'])
    return bloqueada
