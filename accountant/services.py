"""Lógica contable: plan de cuentas base, asientos, contabilización de facturas y reportes.

Todo cálculo parte de las partidas de asientos contabilizados (los anulados no cuentan).
Los saldos se manejan con signo: positivo = debe, negativo = haber.
"""
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import Asiento, Cuenta, Partida

CENTAVO = Decimal('0.01')
CERO = Decimal('0.00')

# Plan de cuentas base, pensado para una pequeña empresa. Se puede ampliar desde la pantalla.
PLAN_BASE = [
    ('1', 'Activo', 'activo', None, False),
    ('1.1', 'Activo corriente', 'activo', '1', False),
    ('1.1.01', 'Caja y bancos', 'activo', '1.1', True),
    ('1.1.02', 'Cuentas por cobrar clientes', 'activo', '1.1', True),
    ('1.1.03', 'Inventario de mercadería', 'activo', '1.1', True),
    ('1.1.04', 'IVA crédito fiscal', 'activo', '1.1', True),
    ('1.2', 'Activo no corriente', 'activo', '1', False),
    ('1.2.01', 'Mobiliario y equipo', 'activo', '1.2', True),
    ('2', 'Pasivo', 'pasivo', None, False),
    ('2.1', 'Pasivo corriente', 'pasivo', '2', False),
    ('2.1.01', 'Cuentas por pagar proveedores', 'pasivo', '2.1', True),
    ('2.1.02', 'IVA débito fiscal', 'pasivo', '2.1', True),
    ('3', 'Patrimonio', 'patrimonio', None, False),
    ('3.1', 'Capital social', 'patrimonio', '3', True),
    ('3.2', 'Utilidades acumuladas', 'patrimonio', '3', True),
    ('4', 'Ingresos', 'ingreso', None, False),
    ('4.1', 'Ventas', 'ingreso', '4', True),
    ('5', 'Costos', 'costo', None, False),
    ('5.1', 'Costo de ventas', 'costo', '5', True),
    ('6', 'Gastos', 'gasto', None, False),
    ('6.1', 'Gastos de operación', 'gasto', '6', True),
]

# Cuentas que usa la contabilización automática de facturas
CUENTA_CAJA = '1.1.01'
CUENTA_CXC = '1.1.02'
CUENTA_VENTAS = '4.1'
CUENTA_IVA_DEBITO = '2.1.02'


class ContabilidadError(Exception):
    pass


def cargar_plan_base():
    """Crea las cuentas base que falten. Se puede ejecutar varias veces sin duplicar nada."""
    creadas = 0
    with transaction.atomic():
        por_codigo = {}
        for codigo, nombre, tipo, padre, detalle in PLAN_BASE:
            cuenta, nueva = Cuenta.objects.get_or_create(
                codigo=codigo,
                defaults={'nombre': nombre, 'tipo': tipo, 'acepta_movimientos': detalle,
                          'padre': por_codigo.get(padre)},
            )
            por_codigo[codigo] = cuenta
            creadas += nueva
    return creadas


def cuenta_por_codigo(codigo):
    return Cuenta.objects.get(codigo=codigo)


def _a_decimal(valor):
    try:
        return Decimal(str(valor or 0)).quantize(CENTAVO)
    except Exception:
        raise ContabilidadError('Los montos deben ser números.')


def crear_asiento(fecha, descripcion, partidas, origen='manual', referencia=''):
    """Guarda un asiento validando que cuadre.

    `partidas` es una lista de dicts con 'cuenta' (instancia o id), 'debe', 'haber' y 'descripcion'.
    """
    if len(partidas) < 2:
        raise ContabilidadError('Un asiento necesita al menos dos partidas.')

    lineas = []
    for linea in partidas:
        cuenta = linea['cuenta'] if isinstance(linea['cuenta'], Cuenta) else Cuenta.objects.filter(pk=linea['cuenta']).first()
        if cuenta is None:
            raise ContabilidadError('Hay una partida con una cuenta que no existe.')
        if not cuenta.acepta_movimientos:
            raise ContabilidadError(f'La cuenta {cuenta.codigo} {cuenta.nombre} es agrupadora: no recibe movimientos.')
        debe, haber = _a_decimal(linea.get('debe')), _a_decimal(linea.get('haber'))
        if debe < 0 or haber < 0:
            raise ContabilidadError('Los montos no pueden ser negativos.')
        if (debe == 0) == (haber == 0):
            raise ContabilidadError(f'En la cuenta {cuenta.codigo} indica un monto en el debe o en el haber, no en ambos ni en ninguno.')
        lineas.append(Partida(cuenta=cuenta, debe=debe, haber=haber, descripcion=linea.get('descripcion', '')[:200]))

    if sum(p.debe for p in lineas) != sum(p.haber for p in lineas):
        raise ContabilidadError('El asiento no cuadra: la suma del debe debe ser igual a la del haber.')

    with transaction.atomic():
        asiento = Asiento.objects.create(
            fecha=fecha, descripcion=descripcion[:200], origen=origen, referencia=referencia[:40],
        )
        for partida in lineas:
            partida.asiento = asiento
        Partida.objects.bulk_create(lineas)
    return asiento


def anular_asiento(asiento):
    if asiento.estado == 'anulado':
        raise ContabilidadError('El asiento ya está anulado.')
    asiento.estado = 'anulado'
    asiento.save(update_fields=['estado'])
    return asiento


def _asiento_ya_existe(origen, referencia):
    return Asiento.objects.filter(origen=origen, referencia=referencia).exclude(estado='anulado').exists()


def contabilizar_facturas():
    """Genera las partidas de venta y de cobro de cada factura que aún no las tenga.

    - Venta: debe Cuentas por cobrar; haber Ventas (base) e IVA débito fiscal.
    - Cobro: cuando la factura está pagada, debe Caja y bancos; haber Cuentas por cobrar.
    Las facturas anuladas anulan sus asientos. Es seguro ejecutarlo varias veces.
    """
    from invoices.models import Invoice

    resumen = {'ventas': 0, 'cobros': 0, 'anuladas': 0}
    cuentas = {c.codigo: c for c in Cuenta.objects.filter(codigo__in=[CUENTA_CAJA, CUENTA_CXC, CUENTA_VENTAS, CUENTA_IVA_DEBITO])}
    if len(cuentas) < 4:
        raise ContabilidadError('Falta el plan de cuentas base. Cárgalo primero.')

    with transaction.atomic():
        for factura in Invoice.objects.prefetch_related('items').order_by('id'):
            referencia = factura.numero
            if factura.status == 'anulada':
                for asiento in Asiento.objects.filter(referencia=referencia, origen__in=['factura', 'cobro']).exclude(estado='anulado'):
                    anular_asiento(asiento)
                    resumen['anuladas'] += 1
                continue

            base = _a_decimal(factura.base_imponible)
            iva = _a_decimal(factura.impuesto_monto)
            total = base + iva
            if total <= 0:
                continue

            if not _asiento_ya_existe('factura', referencia):
                crear_asiento(
                    factura.fecha_emision, f'Venta según factura {referencia}',
                    [
                        {'cuenta': cuentas[CUENTA_CXC], 'debe': total, 'descripcion': referencia},
                        {'cuenta': cuentas[CUENTA_VENTAS], 'haber': base, 'descripcion': referencia},
                        {'cuenta': cuentas[CUENTA_IVA_DEBITO], 'haber': iva, 'descripcion': referencia},
                    ],
                    origen='factura', referencia=referencia,
                )
                resumen['ventas'] += 1

            if factura.status == 'pagada' and not _asiento_ya_existe('cobro', referencia):
                crear_asiento(
                    timezone.localdate(), f'Cobro de factura {referencia}',
                    [
                        {'cuenta': cuentas[CUENTA_CAJA], 'debe': total, 'descripcion': referencia},
                        {'cuenta': cuentas[CUENTA_CXC], 'haber': total, 'descripcion': referencia},
                    ],
                    origen='cobro', referencia=referencia,
                )
                resumen['cobros'] += 1
    return resumen


# ---------- Reportes ----------

def _partidas(desde=None, hasta=None, **filtros):
    """Partidas de asientos contabilizados, dentro del rango de fechas (ambos extremos incluidos)."""
    consulta = Partida.objects.filter(asiento__estado='contabilizado', **filtros)
    if desde:
        consulta = consulta.filter(asiento__fecha__gte=desde)
    if hasta:
        consulta = consulta.filter(asiento__fecha__lte=hasta)
    return consulta


def _saldo(partidas):
    """Suma debe menos haber de un conjunto de partidas."""
    totales = partidas.aggregate(debe=Sum('debe'), haber=Sum('haber'))
    return (totales['debe'] or CERO) - (totales['haber'] or CERO)


def _fila_cuenta(cuenta, signo_saldo):
    return {
        'codigo': cuenta.codigo,
        'nombre': cuenta.nombre,
        'tipo': cuenta.tipo,
        'naturaleza': cuenta.naturaleza,
        'saldo': signo_saldo,
    }


def libro_diario(desde=None, hasta=None):
    asientos = Asiento.objects.filter(estado='contabilizado').prefetch_related('partidas__cuenta').order_by('fecha', 'numero')
    if desde:
        asientos = asientos.filter(fecha__gte=desde)
    if hasta:
        asientos = asientos.filter(fecha__lte=hasta)
    resultado = []
    for asiento in asientos:
        partidas = list(asiento.partidas.all())
        resultado.append({
            'id': asiento.id,
            'numero': asiento.numero,
            'fecha': asiento.fecha,
            'descripcion': asiento.descripcion,
            'origen': asiento.get_origen_display(),
            'referencia': asiento.referencia,
            'partidas': [{
                'codigo': p.cuenta.codigo,
                'cuenta': p.cuenta.nombre,
                'descripcion': p.descripcion,
                'debe': p.debe,
                'haber': p.haber,
            } for p in partidas],
        })
    return resultado


def libro_mayor(cuenta, desde=None, hasta=None):
    """Movimientos de una cuenta con saldo corrido. Incluye el saldo anterior al rango."""
    todas = _partidas(cuenta=cuenta)
    saldo_inicial = _saldo(todas.filter(asiento__fecha__lt=desde)) if desde else CERO
    movimientos = _partidas(desde, hasta, cuenta=cuenta).select_related('asiento').order_by('asiento__fecha', 'asiento__numero', 'id')

    corrido = saldo_inicial
    filas = []
    for partida in movimientos:
        corrido += partida.debe - partida.haber
        filas.append({
            'fecha': partida.asiento.fecha,
            'numero': partida.asiento.numero,
            'descripcion': partida.descripcion or partida.asiento.descripcion,
            'referencia': partida.asiento.referencia,
            'debe': partida.debe,
            'haber': partida.haber,
            'saldo': corrido,
        })
    return {
        'cuenta': _fila_cuenta(cuenta, corrido),
        'saldo_inicial': saldo_inicial,
        'movimientos': filas,
    }


def balanza_comprobacion(desde=None, hasta=None):
    """Por cada cuenta con movimientos: saldo inicial, movimientos del periodo y saldo final."""
    cuentas = Cuenta.objects.filter(acepta_movimientos=True).order_by('codigo')
    filas = []
    tot = {'debe': CERO, 'haber': CERO, 'saldo_deudor': CERO, 'saldo_acreedor': CERO}
    for cuenta in cuentas:
        todas = _partidas(cuenta=cuenta)
        if not todas.exists():
            continue
        inicial = _saldo(todas.filter(asiento__fecha__lt=desde)) if desde else CERO
        periodo = _partidas(desde, hasta, cuenta=cuenta).aggregate(debe=Sum('debe'), haber=Sum('haber'))
        debe, haber = periodo['debe'] or CERO, periodo['haber'] or CERO
        final = inicial + debe - haber
        filas.append({
            'codigo': cuenta.codigo,
            'nombre': cuenta.nombre,
            'tipo': cuenta.tipo,
            'saldo_inicial': inicial,
            'debe': debe,
            'haber': haber,
            'saldo_final': final,
        })
        tot['debe'] += debe
        tot['haber'] += haber
        tot['saldo_deudor'] += max(final, CERO)
        tot['saldo_acreedor'] += max(-final, CERO)
    return {'cuentas': filas, 'totales': tot}


def _saldos_por_tipo(hasta=None, desde=None):
    """Suma (debe menos haber) por tipo de cuenta, para el periodo indicado."""
    consulta = _partidas(desde, hasta)
    por_tipo = {}
    for tipo, _ in Cuenta.TIPOS:
        por_tipo[tipo] = _saldo(consulta.filter(cuenta__tipo=tipo))
    return por_tipo


def _detalle_por_cuenta(tipo, hasta=None, desde=None):
    filas = []
    for cuenta in Cuenta.objects.filter(tipo=tipo, acepta_movimientos=True).order_by('codigo'):
        saldo = _saldo(_partidas(desde, hasta, cuenta=cuenta))
        if saldo != 0:
            filas.append(_fila_cuenta(cuenta, saldo))
    return filas


def balance_general(hasta=None):
    """Activo = Pasivo + Patrimonio. La utilidad del periodo se suma al patrimonio hasta que se cierre."""
    saldos = _saldos_por_tipo(hasta)
    activo = saldos['activo']
    pasivo = -saldos['pasivo']
    patrimonio = -saldos['patrimonio']
    resultado = -(saldos['ingreso'] + saldos['costo'] + saldos['gasto'])
    return {
        'activo': {'total': activo, 'cuentas': _detalle_por_cuenta('activo', hasta)},
        'pasivo': {'total': pasivo, 'cuentas': [_con_signo(f, -1) for f in _detalle_por_cuenta('pasivo', hasta)]},
        'patrimonio': {
            'total': patrimonio + resultado,
            'cuentas': [_con_signo(f, -1) for f in _detalle_por_cuenta('patrimonio', hasta)],
            'resultado_del_ejercicio': resultado,
        },
        'cuadra': activo == pasivo + patrimonio + resultado,
    }


def _con_signo(fila, signo):
    return {**fila, 'saldo': fila['saldo'] * signo}


def estado_resultados(desde=None, hasta=None):
    saldos = _saldos_por_tipo(hasta, desde)
    ingresos = -saldos['ingreso']
    costos = saldos['costo']
    gastos = saldos['gasto']
    utilidad_bruta = ingresos - costos
    return {
        'ingresos': {'total': ingresos, 'cuentas': [_con_signo(f, -1) for f in _detalle_por_cuenta('ingreso', hasta, desde)]},
        'costos': {'total': costos, 'cuentas': _detalle_por_cuenta('costo', hasta, desde)},
        'utilidad_bruta': utilidad_bruta,
        'gastos': {'total': gastos, 'cuentas': _detalle_por_cuenta('gasto', hasta, desde)},
        'utilidad_neta': utilidad_bruta - gastos,
    }
