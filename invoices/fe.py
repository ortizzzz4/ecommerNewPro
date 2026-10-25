"""Facturación electrónica (DTE) para El Salvador.

Lo que hace hoy:
- Asigna número de control y código de generación a cada factura si la facturación electrónica está activa.
- Arma la estructura del DTE (JSON) a partir de la factura.

Lo que NO hace todavía:
- Firmar el documento con el certificado del contribuyente.
- Transmitirlo a la API del Ministerio de Hacienda.
La estructura debe validarse contra los esquemas oficiales del MH antes de usarla en producción.
"""
import uuid

from django.conf import settings
from django.utils import timezone

from empresa.models import Empresa


class FEError(Exception):
    pass


TIPO_DTE = {'factura': '01', 'credito_fiscal': '03'}


def asignar_documento_electronico(factura):
    # Los tickets no son documentos tributarios electrónicos
    if factura.tipo_documento == 'ticket':
        return
    empresa = Empresa.obtener()
    if not empresa.facturacion_electronica:
        return
    if factura.numero_control:
        return

    factura.tipo_dte = TIPO_DTE.get(factura.tipo_documento, '01')
    factura.numero_control = empresa.siguiente_numero_control(factura.tipo_dte)
    factura.codigo_generacion = str(uuid.uuid4()).upper()
    factura.estado_fe = 'generado'
    factura.save(update_fields=['tipo_dte', 'numero_control', 'codigo_generacion', 'estado_fe'])


def construir_dte(factura):
    empresa = Empresa.obtener()
    if not factura.numero_control:
        raise FEError('La factura no tiene documento electrónico. Activa la facturación electrónica.')

    ahora = timezone.localtime(timezone.now())
    cliente = factura.cliente
    receptor = None
    if cliente:
        receptor = {'nombre': cliente.nombre, 'nit': cliente.nit or None, 'nrc': cliente.nrc or None}

    items = []
    for numero, item in enumerate(factura.items.all(), start=1):
        items.append({
            'numItem': numero,
            'tipoItem': 1,  # 1 = bien, 2 = servicio
            'descripcion': item.descripcion,
            'cantidad': item.cantidad,
            'precioUni': f'{item.precio_unit:.2f}',
            'ventaGravada': f'{item.total_linea:.2f}',
        })

    return {
        'identificacion': {
            'tipoDte': factura.tipo_dte,
            'ambiente': empresa.ambiente,
            'numeroControl': factura.numero_control,
            'codigoGeneracion': factura.codigo_generacion,
            'fecEmi': ahora.date().isoformat(),
            'horEmi': ahora.strftime('%H:%M:%S'),
        },
        'emisor': {
            'nit': empresa.nit,
            'nrc': empresa.nrc,
            'nombre': empresa.razon_social,
            'nombreComercial': empresa.nombre_comercial,
            'giro': empresa.giro,
            'codigoEstablecimiento': empresa.codigo_establecimiento,
            'codigoPuntoVenta': empresa.codigo_punto_venta,
        },
        'receptor': receptor,
        'cuerpoDocumento': items,
        'resumen': {
            'totalGravada': f'{factura.base_imponible:.2f}',
            'descuento': f'{factura.descuento_monto:.2f}',
            'iva': f'{factura.impuesto_monto:.2f}',
            'totalPagar': f'{factura.total:.2f}',
        },
    }


def transmitir(factura):
    """Envío a Hacienda. Requiere certificado y credenciales; sin ellos no se intenta nada."""
    faltan = [
        variable for variable in ('MH_CERT_PATH', 'MH_CERT_PASSWORD', 'MH_USUARIO', 'MH_CLAVE')
        if not getattr(settings, variable, '')
    ]
    if faltan:
        raise FEError(
            'La transmisión a Hacienda no está configurada. Faltan: ' + ', '.join(faltan)
            + '. Documento generado localmente, pendiente de envío.'
        )
    raise FEError('La transmisión a Hacienda aún no está implementada.')

