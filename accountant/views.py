from datetime import date
from decimal import Decimal

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Asiento, Cuenta
from .services import (
    ContabilidadError, anular_asiento, balance_general, balanza_comprobacion, cargar_plan_base,
    contabilizar_facturas, crear_asiento, estado_resultados, libro_diario, libro_mayor,
)


class PermisoContable(BasePermission):
    """Cada vista declara el permiso que pide por método HTTP, por ejemplo {'GET': 'accountant.view_partida'}."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        requerido = view.permisos.get(request.method)
        return requerido is None or request.user.has_perm(requerido)


class VistaContable(APIView):
    permission_classes = [IsAuthenticated, PermisoContable]
    permisos = {}


def _fecha(valor):
    """Convierte 'AAAA-MM-DD' en fecha. Devuelve None si no hay valor y lanza ValueError si no es válida."""
    if not valor:
        return None
    return date.fromisoformat(valor)


def _rango(request):
    return _fecha(request.query_params.get('desde')), _fecha(request.query_params.get('hasta'))


def _error(mensaje):
    return Response({'detail': mensaje}, status=status.HTTP_400_BAD_REQUEST)


def _cuenta_por_id(valor):
    """La cuenta con ese id, o None si el valor está vacío, no es un número o no existe."""
    try:
        return Cuenta.objects.filter(pk=int(valor)).first() if valor not in (None, '') else None
    except (TypeError, ValueError):
        return None


def _montos(valor):
    """Convierte los montos en texto con dos decimales, igual que el resto de la API."""
    if isinstance(valor, Decimal):
        return f'{valor:.2f}'
    if isinstance(valor, dict):
        return {clave: _montos(v) for clave, v in valor.items()}
    if isinstance(valor, list):
        return [_montos(v) for v in valor]
    return valor


def _cuenta_payload(cuenta):
    return {
        'id': cuenta.id,
        'codigo': cuenta.codigo,
        'nombre': cuenta.nombre,
        'tipo': cuenta.tipo,
        'tipo_display': cuenta.get_tipo_display(),
        'naturaleza': cuenta.naturaleza,
        'padre': cuenta.padre_id,
        'acepta_movimientos': cuenta.acepta_movimientos,
    }


def _asiento_payload(asiento):
    partidas = list(asiento.partidas.select_related('cuenta'))
    return {
        'id': asiento.id,
        'numero': asiento.numero,
        'fecha': asiento.fecha,
        'descripcion': asiento.descripcion,
        'origen': asiento.origen,
        'origen_display': asiento.get_origen_display(),
        'referencia': asiento.referencia,
        'estado': asiento.estado,
        'total': sum(p.debe for p in partidas),
        'partidas': [{
            'cuenta': p.cuenta_id,
            'codigo': p.cuenta.codigo,
            'nombre': p.cuenta.nombre,
            'descripcion': p.descripcion,
            'debe': p.debe,
            'haber': p.haber,
        } for p in partidas],
    }


class CuentasView(VistaContable):
    """GET: plan de cuentas. POST: crear una cuenta."""
    permisos = {'GET': 'accountant.view_cuenta', 'POST': 'accountant.add_cuenta'}

    def get(self, request):
        return Response([_cuenta_payload(c) for c in Cuenta.objects.all()])

    def post(self, request):
        datos = request.data
        codigo = str(datos.get('codigo', '')).strip()
        if not codigo or not str(datos.get('nombre', '')).strip():
            return _error('Indica el código y el nombre de la cuenta.')
        if datos.get('tipo') not in dict(Cuenta.TIPOS):
            return _error('El tipo de cuenta no es válido.')
        if Cuenta.objects.filter(codigo=codigo).exists():
            return _error('Ya existe una cuenta con ese código.')
        padre = _cuenta_por_id(datos.get('padre'))
        cuenta = Cuenta.objects.create(
            codigo=codigo, nombre=str(datos['nombre']).strip(), tipo=datos['tipo'], padre=padre,
            acepta_movimientos=bool(datos.get('acepta_movimientos', True)),
        )
        return Response(_cuenta_payload(cuenta), status=status.HTTP_201_CREATED)


class CargarPlanBaseView(VistaContable):
    permisos = {'POST': 'accountant.add_cuenta'}

    def post(self, request):
        return Response({'creadas': cargar_plan_base()})


class AsientosView(VistaContable):
    """GET: asientos del periodo. POST: registrar un asiento manual."""
    permisos = {'GET': 'accountant.view_partida', 'POST': 'accountant.add_asiento'}

    def get(self, request):
        try:
            desde, hasta = _rango(request)
        except ValueError:
            return _error('Las fechas deben tener formato AAAA-MM-DD.')
        asientos = Asiento.objects.prefetch_related('partidas__cuenta').order_by('-fecha', '-numero')
        if desde:
            asientos = asientos.filter(fecha__gte=desde)
        if hasta:
            asientos = asientos.filter(fecha__lte=hasta)
        return Response(_montos([_asiento_payload(a) for a in asientos[:300]]))

    def post(self, request):
        datos = request.data
        try:
            fecha = _fecha(datos.get('fecha')) or date.today()
        except ValueError:
            return _error('La fecha debe tener formato AAAA-MM-DD.')
        if not str(datos.get('descripcion', '')).strip():
            return _error('Escribe una descripción para el asiento.')
        try:
            asiento = crear_asiento(fecha, str(datos['descripcion']).strip(), datos.get('partidas') or [])
        except ContabilidadError as exc:
            return _error(str(exc))
        return Response(_montos(_asiento_payload(asiento)), status=status.HTTP_201_CREATED)


class AsientoAnularView(VistaContable):
    permisos = {'POST': 'accountant.change_asiento'}

    def post(self, request, pk):
        asiento = get_object_or_404(Asiento, pk=pk)
        try:
            anular_asiento(asiento)
        except ContabilidadError as exc:
            return _error(str(exc))
        return Response(_montos(_asiento_payload(asiento)))


class ContabilizarFacturasView(VistaContable):
    permisos = {'POST': 'accountant.add_asiento'}

    def post(self, request):
        try:
            resumen = contabilizar_facturas()
        except ContabilidadError as exc:
            return _error(str(exc))
        return Response(_montos(resumen))


class LibroDiarioView(VistaContable):
    permisos = {'GET': 'accountant.view_partida'}

    def get(self, request):
        try:
            desde, hasta = _rango(request)
        except ValueError:
            return _error('Las fechas deben tener formato AAAA-MM-DD.')
        return Response(_montos(libro_diario(desde, hasta)))


class LibroMayorView(VistaContable):
    permisos = {'GET': 'accountant.view_partida'}

    def get(self, request):
        try:
            desde, hasta = _rango(request)
        except ValueError:
            return _error('Las fechas deben tener formato AAAA-MM-DD.')
        cuenta = _cuenta_por_id(request.query_params.get('cuenta'))
        if cuenta is None:
            return _error('Elige una cuenta.')
        return Response(_montos(libro_mayor(cuenta, desde, hasta)))


class BalanzaView(VistaContable):
    permisos = {'GET': 'accountant.view_partida'}

    def get(self, request):
        try:
            desde, hasta = _rango(request)
        except ValueError:
            return _error('Las fechas deben tener formato AAAA-MM-DD.')
        return Response(_montos(balanza_comprobacion(desde, hasta)))


class BalanceGeneralView(VistaContable):
    permisos = {'GET': 'accountant.view_partida'}

    def get(self, request):
        try:
            _, hasta = _rango(request)
        except ValueError:
            return _error('La fecha debe tener formato AAAA-MM-DD.')
        return Response(_montos(balance_general(hasta)))


class EstadoResultadosView(VistaContable):
    permisos = {'GET': 'accountant.view_partida'}

    def get(self, request):
        try:
            desde, hasta = _rango(request)
        except ValueError:
            return _error('Las fechas deben tener formato AAAA-MM-DD.')
        return Response(_montos(estado_resultados(desde, hasta)))
