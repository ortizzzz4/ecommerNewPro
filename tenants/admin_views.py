from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .bases import PUBLICO, eliminar_base_de_datos, eliminar_esquema
from .models import EmpresaRegistrada, Pago
from .modulos import MODULOS, MODULOS_BASE
from .pagos import activar_pago
from .servicios import RegistroError, crear_empresa


class EsPlataforma(BasePermission):
    """Solo la administración de la plataforma (base maestra, superusuario).

    El administrador de una empresa también es superusuario, pero en su propia base: a él no le toca.
    """

    def has_permission(self, request, view):
        return (request.user.is_authenticated and request.user.is_superuser
                and getattr(request, 'empresa', None) is None)


def _pago_admin(pago):
    return {
        'id': pago.id,
        'empresa': pago.empresa.slug,
        'empresa_nombre': pago.empresa.nombre,
        'plan': pago.plan.nombre,
        'metodo': pago.get_metodo_display(),
        'estado': pago.get_estado_display(),
        'estado_codigo': pago.estado,
        'monto': f'{pago.monto:.2f}',
        'referencia': pago.referencia,
        'creado': pago.creado,
        'confirmado_en': pago.confirmado_en,
    }


def _empresa_admin(empresa):
    ultimo = empresa.pagos_de_la_base().order_by('-creado').first()
    return {
        'id': empresa.id,
        'slug': empresa.slug,
        'nombre': empresa.nombre,
        'correo': empresa.correo,
        'db_name': empresa.db_name,
        'estado': empresa.estado,
        'bloqueada': empresa.bloqueada,
        'es_prueba': empresa.es_prueba,
        'titular': empresa.titular.pk == empresa.pk,
        'modulos': empresa.modulos,
        'plan': empresa.plan.nombre if empresa.plan else None,
        'trial_hasta': empresa.trial_hasta,
        'suscripcion_hasta': empresa.suscripcion_hasta,
        'dias_restantes': empresa.dias_restantes,
        'creada': empresa.creada,
        'pagos_pendientes': empresa.pagos_de_la_base().filter(estado='pendiente').count(),
        'ultimo_pago': {'fecha': ultimo.creado, 'estado': ultimo.get_estado_display(),
                        'metodo': ultimo.get_metodo_display()} if ultimo else None,
    }


class EmpresasAdminView(APIView):
    """Todas las empresas registradas, con su estado, base de datos y último pago.

    Filtros: ?estado=prueba|activa|vencida|bloqueada y ?q=texto (nombre, identificador o correo).
    """
    permission_classes = [IsAuthenticated, EsPlataforma]

    def get(self, request):
        empresas = EmpresaRegistrada.objects.select_related('plan').all()
        texto = request.query_params.get('q', '').strip()
        if texto:
            empresas = empresas.filter(Q(nombre__icontains=texto) | Q(slug__icontains=texto) | Q(correo__icontains=texto))
        estado = request.query_params.get('estado')
        resultado = [_empresa_admin(e) for e in empresas]
        if estado:
            resultado = [e for e in resultado if e['estado'] == estado]
        return Response(resultado)


class EmpresaAdminDetailView(APIView):
    """Detalle de una empresa. PATCH cambia el bloqueo y los módulos contratados."""
    permission_classes = [IsAuthenticated, EsPlataforma]

    def get(self, request, pk):
        empresa = EmpresaRegistrada.objects.select_related('plan').filter(pk=pk).first()
        if empresa is None:
            return Response({'detail': 'La empresa no existe.'}, status=status.HTTP_404_NOT_FOUND)
        datos = _empresa_admin(empresa)
        datos['pagos'] = [_pago_admin(p) for p in empresa.pagos_de_la_base().select_related('plan', 'empresa')[:30]]
        return Response(datos)

    def patch(self, request, pk):
        empresa = EmpresaRegistrada.objects.filter(pk=pk).first()
        if empresa is None:
            return Response({'detail': 'La empresa no existe.'}, status=status.HTTP_404_NOT_FOUND)

        if 'bloqueada' in request.data:
            # El bloqueo es de la base: aplica a todas sus empresas
            empresa.bloqueada = bool(request.data['bloqueada'])
            EmpresaRegistrada.objects.filter(db_name=empresa.db_name).update(bloqueada=empresa.bloqueada)

        if 'modulos' in request.data:
            elegidos = list(request.data['modulos'] or [])
            validos = set(MODULOS) | set(MODULOS_BASE)
            if any(m not in validos for m in elegidos):
                return Response({'detail': 'Hay módulos que no existen.'}, status=status.HTTP_400_BAD_REQUEST)
            # Los módulos base siempre quedan incluidos
            empresa.modulos = elegidos + [m for m in MODULOS_BASE if m not in elegidos]

        empresa.save()
        return Response(_empresa_admin(empresa))

    def delete(self, request, pk):
        """Elimina una empresa de pruebas con su base de datos. Las empresas reales no se borran desde aquí."""
        empresa = EmpresaRegistrada.objects.filter(pk=pk).first()
        if empresa is None:
            return Response({'detail': 'La empresa no existe.'}, status=status.HTTP_404_NOT_FOUND)
        if not empresa.es_prueba:
            return Response({'detail': 'Solo se pueden eliminar empresas de pruebas.'}, status=status.HTTP_400_BAD_REQUEST)
        if empresa.esquema != PUBLICO:
            # Empresa dentro de una base compartida: solo se borra su esquema
            eliminar_esquema(empresa.db_name, empresa.esquema)
        elif EmpresaRegistrada.objects.filter(db_name=empresa.db_name).exclude(pk=empresa.pk).exists():
            return Response({'detail': 'No se puede eliminar la empresa principal mientras existan otras empresas en su base.'},
                            status=status.HTTP_400_BAD_REQUEST)
        else:
            eliminar_base_de_datos(empresa.db_name)
        empresa.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmpresaPruebaView(APIView):
    """Crea una empresa de pruebas: sin vencimiento, con datos de demostración y todos los módulos."""
    permission_classes = [IsAuthenticated, EsPlataforma]

    def post(self, request):
        try:
            empresa = crear_empresa({
                'slug': str(request.data.get('slug', '')).strip().lower(),
                'nombre': request.data.get('nombre', ''),
                'correo': request.data.get('correo', ''),
                'usuario': request.data.get('usuario', ''),
                'password': request.data.get('password', ''),
                'modulos': [],
                'es_prueba': True,
            })
        except RegistroError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_empresa_admin(empresa), status=status.HTTP_201_CREATED)


class ExtenderPruebaView(APIView):
    """Suma días a la prueba de una empresa (por ejemplo, una prórroga acordada)."""
    permission_classes = [IsAuthenticated, EsPlataforma]

    def post(self, request, pk):
        empresa = EmpresaRegistrada.objects.filter(pk=pk).first()
        if empresa is None:
            return Response({'detail': 'La empresa no existe.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            dias = int(request.data.get('dias'))
        except (TypeError, ValueError):
            return Response({'detail': 'Indica un número de días.'}, status=status.HTTP_400_BAD_REQUEST)
        if not 1 <= dias <= 365:
            return Response({'detail': 'Los días deben estar entre 1 y 365.'}, status=status.HTTP_400_BAD_REQUEST)

        # Si la prueba ya terminó, la prórroga cuenta desde hoy
        base = max(empresa.trial_hasta, timezone.now())
        empresa.trial_hasta = base + timedelta(days=dias)
        # La prueba es de la base: se extiende para todas sus empresas
        EmpresaRegistrada.objects.filter(db_name=empresa.db_name).update(trial_hasta=empresa.trial_hasta)
        return Response(_empresa_admin(empresa))


class PagosAdminView(APIView):
    """Pagos de todas las empresas. Por defecto solo los pendientes; ?estado=todos muestra todos."""
    permission_classes = [IsAuthenticated, EsPlataforma]

    def get(self, request):
        pagos = Pago.objects.select_related('empresa', 'plan')
        estado = request.query_params.get('estado', 'pendiente')
        if estado != 'todos':
            pagos = pagos.filter(estado=estado)
        return Response([_pago_admin(p) for p in pagos[:200]])


class ConfirmarPagoAdminView(APIView):
    """Confirma un pago recibido (transferencia) y activa la suscripción de la empresa."""
    permission_classes = [IsAuthenticated, EsPlataforma]

    def post(self, request, pk):
        if not Pago.objects.filter(pk=pk).exists():
            return Response({'detail': 'El pago no existe.'}, status=status.HTTP_404_NOT_FOUND)
        pago = activar_pago(pk)
        return Response(_pago_admin(pago))
