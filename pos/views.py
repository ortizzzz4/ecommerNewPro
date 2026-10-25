from django.shortcuts import get_object_or_404
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CajaSesion, PrinterProfile, VentaPos
from .services import (
    PRODUCTOS_POS as PRODUCTOS_POS_TIPOS,
    PosError, abrir_cajon, abrir_caja, caja_abierta, cerrar_caja, crear_venta, imprimir_prueba, imprimir_venta,
    impresora_predeterminada,
)
from .ticket import construir_cierre
from .transport import enviar
from .transport import PrinterError
from .seguridad import (
    PosDesbloqueado, bloqueado, generar_token, limpiar_fallos, registrar_fallo,
)
from products.models import Product
from users.permisos import pin_valido


class PuedeUsarPos(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_perm('pos.use_pos')


class PermisoImpresoras(BasePermission):
    """Cualquiera con acceso al POS puede ver las impresoras; cambiarlas requiere permisos de modelo."""

    acciones_escritura = {'POST': 'add', 'PUT': 'change', 'PATCH': 'change', 'DELETE': 'delete'}

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return user.has_perm('pos.use_pos')
        codename = self.acciones_escritura.get(request.method)
        return codename is not None and user.has_perm(f'pos.{codename}_printerprofile')


class ImpresoraSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrinterProfile
        fields = ['id', 'nombre', 'conexion', 'host', 'puerto', 'destino',
                  'ancho_papel', 'codepage', 'predeterminada', 'activa']


class ImpresoraViewSet(viewsets.ModelViewSet):
    serializer_class = ImpresoraSerializer
    queryset = PrinterProfile.objects.all()
    permission_classes = [PermisoImpresoras]

    @action(detail=True, methods=['post'], permission_classes=[PuedeUsarPos])
    def prueba(self, request, pk=None):
        impresora = self.get_object()
        try:
            imprimir_prueba(impresora)
        except PrinterError as exc:
            return Response({'ok': False, 'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({'ok': True, 'detail': 'Prueba enviada a la impresora.'})


def venta_payload(venta):
    return {
        'id': venta.id,
        'folio': venta.folio,
        'cajero': venta.cajero.username if venta.cajero else None,
        'creada': venta.creada,
        'subtotal': f'{venta.subtotal:.2f}',
        'descuento_pct': f'{venta.descuento_pct:.2f}',
        'descuento_monto': f'{venta.descuento_monto:.2f}',
        'impuesto_pct': f'{venta.impuesto_pct:.2f}',
        'impuesto_monto': f'{venta.impuesto_monto:.2f}',
        'total': f'{venta.total:.2f}',
        'metodo_pago': venta.metodo_pago,
        'monto_recibido': f'{venta.monto_recibido:.2f}',
        'cambio': f'{venta.cambio:.2f}',
        'factura': (
            {
                'id': venta.factura.id,
                'numero': venta.factura.numero,
                'tipo_documento': venta.factura.tipo_documento,
            }
            if venta.factura else None
        ),
        'lineas': [
            {
                'descripcion': linea.descripcion,
                'cantidad': linea.cantidad,
                'precio_unit': f'{linea.precio_unit:.2f}',
                'total_linea': f'{linea.total_linea:.2f}',
            }
            for linea in venta.lineas.all()
        ],
    }


def obtener_impresora(impresora_id):
    if impresora_id:
        return get_object_or_404(PrinterProfile, pk=impresora_id, activa=True)
    return impresora_predeterminada()


def resultado_impresion(impresora, venta):
    if impresora is None:
        return {'ok': False, 'detail': 'No hay una impresora predeterminada configurada.'}
    try:
        imprimir_venta(venta, impresora)
    except PrinterError as exc:
        return {'ok': False, 'detail': str(exc)}
    return {'ok': True, 'detail': f'Ticket enviado a {impresora.nombre}.'}


class DesbloqueoPosView(APIView):
    """Valida el PIN del cajero y devuelve el token que usan las demás operaciones del POS."""
    permission_classes = [PuedeUsarPos]

    def post(self, request):
        user = request.user
        if not user.tiene_pin():
            return Response({'detail': 'Todavía no tienes PIN. Créalo en "Mi PIN".'}, status=status.HTTP_400_BAD_REQUEST)
        if bloqueado(user):
            return Response(
                {'detail': 'Demasiados intentos fallidos. Espera 5 minutos o pide a un administrador que revise.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        pin = str(request.data.get('pin', ''))
        if not pin_valido(pin) or not user.check_pin(pin):
            registrar_fallo(user)
            return Response({'detail': 'PIN incorrecto.'}, status=status.HTTP_403_FORBIDDEN)
        limpiar_fallos(user)
        return Response({'token': generar_token(user)})


class ProductosPosView(APIView):
    """Productos que se pueden vender en el POS: bienes y combos visibles en POS."""
    permission_classes = [PuedeUsarPos, PosDesbloqueado]

    def get(self, request):
        productos = (
            Product.objects.filter(visible_pos=True, tipo__in=PRODUCTOS_POS_TIPOS)
            .prefetch_related('category_set')
            .order_by('title')
        )
        return Response([
            {
                'id': p.id,
                'title': p.title,
                'codigo_barras': p.codigo_barras,
                'price': f'{p.price:.2f}',
                'image': request.build_absolute_uri(p.image.url) if p.image else None,
                'tipo': p.tipo,
                'stock': f'{p.stock:.2f}',
                'categorias': [c.id for c in p.category_set.all()],
            }
            for p in productos
        ])


class VentaPosViewSet(viewsets.ViewSet):
    permission_classes = [PuedeUsarPos, PosDesbloqueado]

    def list(self, request):
        ventas = VentaPos.objects.select_related('cajero', 'factura').prefetch_related('lineas')[:100]
        return Response([venta_payload(v) for v in ventas])

    def retrieve(self, request, pk=None):
        venta = get_object_or_404(VentaPos.objects.select_related('cajero').prefetch_related('lineas'), pk=pk)
        return Response(venta_payload(venta))

    def create(self, request):
        datos = request.data
        documento = datos.get('documento', 'ticket')
        if documento != 'ticket' and not request.user.has_perm('invoices.add_invoice'):
            return Response(
                {'detail': 'Tu rol no tiene permiso para emitir facturas o créditos fiscales.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        caja = caja_abierta(request.user)
        if caja is None:
            return Response({'detail': 'Abre la caja antes de vender.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            venta = crear_venta(
                cajero=request.user,
                caja=caja,
                lineas=datos.get('lineas') or [],
                metodo_pago=datos.get('metodo_pago', 'efectivo'),
                monto_recibido=datos.get('monto_recibido'),
                descuento_pct=datos.get('descuento_pct') or 0,
                documento=documento,
                cliente_id=datos.get('cliente_id'),
            )
        except PosError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        impresion = None
        if datos.get('imprimir', True):
            impresion = resultado_impresion(obtener_impresora(datos.get('impresora_id')), venta)

        # La venta ya quedó guardada aunque la impresión falle; el cajero lo ve en la respuesta
        return Response({'venta': venta_payload(venta), 'impresion': impresion}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def imprimir(self, request, pk=None):
        venta = get_object_or_404(VentaPos.objects.prefetch_related('lineas').select_related('cajero'), pk=pk)
        impresora = obtener_impresora(request.data.get('impresora_id'))
        return Response(resultado_impresion(impresora, venta))


class AbrirCajonView(APIView):
    permission_classes = [PuedeUsarPos, PosDesbloqueado]

    def post(self, request):
        impresora = obtener_impresora(request.data.get('impresora_id'))
        if impresora is None:
            return Response({'detail': 'No hay una impresora configurada.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            abrir_cajon(impresora)
        except PrinterError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({'ok': True})


def caja_payload(caja):
    return {
        'id': caja.id,
        'cajero': caja.cajero.username if caja.cajero else None,
        'abierta': caja.abierta,
        'cerrada': caja.cerrada,
        'monto_inicial': f'{caja.monto_inicial:.2f}',
        'desglose_inicial': caja.desglose_inicial,
        'desglose_contado': caja.desglose_contado,
        'total_efectivo': _fmt(caja.total_efectivo),
        'total_tarjeta': _fmt(caja.total_tarjeta),
        'total_transferencia': _fmt(caja.total_transferencia),
        'esperado_efectivo': _fmt(caja.esperado_efectivo),
        'monto_contado': _fmt(caja.monto_contado),
        'diferencia': _fmt(caja.diferencia),
    }


def _fmt(valor):
    return None if valor is None else f'{valor:.2f}'


class CajaActualView(APIView):
    permission_classes = [PuedeUsarPos, PosDesbloqueado]

    def get(self, request):
        caja = caja_abierta(request.user)
        return Response({'caja': caja_payload(caja) if caja else None})


class CajaAbrirView(APIView):
    permission_classes = [PuedeUsarPos, PosDesbloqueado]

    def post(self, request):
        try:
            caja = abrir_caja(request.user, request.data.get('monto_inicial'), request.data.get('desglose'))
        except PosError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(caja_payload(caja), status=status.HTTP_201_CREATED)


class CajaCerrarView(APIView):
    permission_classes = [PuedeUsarPos, PosDesbloqueado]

    def post(self, request):
        caja = caja_abierta(request.user)
        if caja is None:
            return Response({'detail': 'No tienes una caja abierta.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            caja = cerrar_caja(caja, request.data.get('monto_contado'), request.data.get('desglose'))
        except PosError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        impresion = {'ok': False, 'detail': 'Corte sin imprimir.'}
        if request.data.get('imprimir', True):
            impresora = obtener_impresora(request.data.get('impresora_id'))
            if impresora is None:
                impresion = {'ok': False, 'detail': 'No hay impresora configurada.'}
            else:
                try:
                    enviar(impresora, construir_cierre(caja, impresora.ancho_papel, impresora.codepage))
                    impresion = {'ok': True, 'detail': f'Corte enviado a {impresora.nombre}.'}
                except PrinterError as exc:
                    impresion = {'ok': False, 'detail': str(exc)}
        return Response({'caja': caja_payload(caja), 'impresion': impresion})


class CajasListaView(APIView):
    """Historial de cajas: lo ve quien tenga permiso de ver cajas."""
    permission_classes = [PuedeUsarPos]

    def get(self, request):
        if not request.user.has_perm('pos.view_cajasesion'):
            return Response({'detail': 'No tienes permiso para ver el historial de cajas.'}, status=status.HTTP_403_FORBIDDEN)
        cajas = CajaSesion.objects.select_related('cajero')[:100]
        return Response([caja_payload(c) for c in cajas])
