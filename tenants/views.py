import stripe
from django.conf import settings
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth.hashers import make_password

from cuentas.models import AccesoEmpresa, CuentaUsuario

from .bases import en_cuenta, en_empresa
from .cuentas import (
    accesos_de, acceso_de, conceder, cuenta_de, cuenta_desde_usuario_de_empresa, cuenta_por_usuario,
    sincronizar, verificar_clave,
)
from .models import EmpresaRegistrada, Pago, Plan
from .modulos import MODULOS, MODULOS_BASE, TITULOS_BASE, titulo_de
from .pagos import PagoError, activar_pago, crear_pago_stripe, crear_pago_transferencia
from .servicios import RegistroError, crear_empresa, generar_slug


def _modulos_de(lista):
    return [{'id': m, 'titulo': titulo_de(m)} for m in lista]


def _tokens_para(usuario, empresa):
    # El claim 'empresa' hace que cada petición use la base y el esquema de esta empresa
    refresh = RefreshToken.for_user(usuario)
    refresh['empresa'] = empresa.slug
    return {'access': str(refresh.access_token), 'refresh': str(refresh), 'empresa': empresa.slug}


def _pago_payload(pago):
    return {
        'id': pago.id,
        'plan': pago.plan.nombre,
        'metodo': pago.get_metodo_display(),
        'estado': pago.get_estado_display(),
        'monto': f'{pago.monto:.2f}',
        'referencia': pago.referencia,
        'creado': pago.creado,
        'confirmado_en': pago.confirmado_en,
    }


def _empresa_de(request):
    """Empresa de la sesión, o None si la sesión es de la administración de la plataforma."""
    return getattr(request, 'empresa', None)


class ModulosCatalogoView(APIView):
    """Módulos que una empresa puede elegir al registrarse."""
    permission_classes = [AllowAny]

    def get(self, request):
        elegibles = [{'id': m, 'titulo': datos['titulo'], 'base': False} for m, datos in MODULOS.items()]
        base = [{'id': m, 'titulo': TITULOS_BASE[m], 'base': True} for m in MODULOS_BASE]
        return Response(elegibles + base)


class RegistroEmpresaView(APIView):
    """Registro de una cuenta nueva: crea su base de datos, su primera empresa y su usuario administrador."""
    permission_classes = [AllowAny]

    def post(self, request):
        datos = request.data
        try:
            empresa = crear_empresa({
                'slug': str(datos.get('slug', '')).strip().lower(),
                'nombre': datos.get('nombre', ''),
                'correo': datos.get('correo', ''),
                'usuario': datos.get('usuario', ''),
                'password': datos.get('password', ''),
                'modulos': datos.get('modulos') or [],
            })
        except RegistroError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        # El administrador queda en la base de la cuenta, con una sola contraseña para todas sus empresas
        with en_cuenta(empresa.db_name):
            cuenta = CuentaUsuario.objects.create(
                username=datos['usuario'].strip(), email=datos['correo'], password=make_password(datos['password']),
            )
        conceder(cuenta, empresa, 'Administrador')
        return Response({
            'empresa': empresa.slug,
            'nombre': empresa.nombre,
            'trial_hasta': empresa.trial_hasta,
        }, status=status.HTTP_201_CREATED)


class LoginEmpresaView(APIView):
    """Inicio de sesión: identificador de empresa, usuario y contraseña (la misma para todas sus empresas).

    Una empresa bloqueada o vencida sí deja entrar; lo que se bloquea son sus módulos.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        slug = str(request.data.get('empresa', '')).strip().lower()
        usuario = str(request.data.get('usuario', '')).strip()
        password = request.data.get('password', '')
        error = {'detail': 'Empresa, usuario o contraseña incorrectos.'}

        empresa = EmpresaRegistrada.objects.filter(slug=slug).first()
        if empresa is None:
            return Response(error, status=status.HTTP_401_UNAUTHORIZED)

        cuenta = cuenta_por_usuario(empresa.db_name, usuario)
        if cuenta is None:
            # Usuario creado antes de existir las cuentas: se valida en la empresa y se crea su cuenta
            with en_empresa(empresa):
                user = authenticate(username=usuario, password=password)
            if user is None or not user.is_active:
                return Response(error, status=status.HTTP_401_UNAUTHORIZED)
            cuenta = cuenta_desde_usuario_de_empresa(user, empresa)
        elif not cuenta.activo or not verificar_clave(cuenta, empresa, password):
            return Response(error, status=status.HTTP_401_UNAUTHORIZED)

        if acceso_de(cuenta, empresa) is None:
            return Response({'detail': 'No tienes acceso a esta empresa. Pide al administrador que te la asigne.'},
                            status=status.HTTP_403_FORBIDDEN)
        return Response(_tokens_para(sincronizar(cuenta, empresa), empresa))


class MisEmpresasView(APIView):
    """Empresas a las que la cuenta de la sesión tiene acceso (todas dentro de su misma base)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        actual = _empresa_de(request)
        cuenta = cuenta_de(request.user, actual) if actual else None
        if cuenta is None:
            return Response([])
        return Response([{
            'empresa': e.slug,
            'nombre': e.nombre,
            'rol': a.rol,
            'es_actual': e.id == actual.id,
            'bloqueada': e.bloqueada,
            'es_prueba': e.es_prueba,
        } for a, e in accesos_de(cuenta, actual.db_name)])


class CambiarEmpresaView(APIView):
    """Pasa la sesión a otra empresa a la que la cuenta tiene acceso. No pide la contraseña."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        actual = _empresa_de(request)
        cuenta = cuenta_de(request.user, actual) if actual else None
        slug = str(request.data.get('empresa', '')).strip().lower()
        if cuenta is None or not cuenta.activo:
            return Response({'detail': 'Tu cuenta no puede cambiar de empresa.'}, status=status.HTTP_403_FORBIDDEN)
        if slug == actual.slug:
            return Response({'detail': 'Ya estás en esa empresa.'}, status=status.HTTP_400_BAD_REQUEST)

        destino = EmpresaRegistrada.objects.filter(slug=slug, db_name=actual.db_name).first()
        if destino is None or acceso_de(cuenta, destino) is None:
            return Response({'detail': 'No tienes acceso a esa empresa.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(_tokens_para(sincronizar(cuenta, destino), destino))


class MiEmpresaView(APIView):
    """Datos de la empresa de la sesión: módulos, prueba y suscripción."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa = _empresa_de(request)
        if empresa is None:
            # Administración de la plataforma: ve todos los módulos
            todos = list(MODULOS) + MODULOS_BASE
            return Response({'empresa': None, 'nombre': 'Administración', 'modulos': _modulos_de(todos),
                             'vencida': False, 'trial_hasta': None, 'dias_restantes': None,
                             'suscripcion_activa': True, 'suscripcion_hasta': None, 'plan': None,
                             'es_prueba': False})
        return Response({
            'empresa': empresa.slug,
            'nombre': empresa.nombre,
            'es_prueba': empresa.es_prueba,
            'bloqueada': empresa.bloqueada,
            'modulos': _modulos_de(empresa.modulos),
            'vencida': empresa.vencida,
            'trial_hasta': empresa.trial_hasta,
            'dias_restantes': empresa.dias_restantes,
            'suscripcion_activa': empresa.suscripcion_activa,
            'suscripcion_hasta': empresa.suscripcion_hasta,
            'plan': empresa.plan.nombre if empresa.plan else None,
        })


class PlanesView(APIView):
    """Planes disponibles para contratar."""
    permission_classes = [AllowAny]

    def get(self, request):
        planes = Plan.objects.filter(activo=True)
        return Response([{
            'id': p.id, 'nombre': p.nombre, 'descripcion': p.descripcion,
            'precio': f'{p.precio:.2f}', 'dias': p.dias,
        } for p in planes])


class PagosView(APIView):
    """Pagos de la empresa de la sesión: historial y creación por transferencia o por tarjeta."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa = _empresa_de(request)
        if empresa is None:
            return Response({'detail': 'Esta sesión no pertenece a una empresa.'}, status=status.HTTP_400_BAD_REQUEST)
        pagos = empresa.pagos_de_la_base().select_related('plan')[:50]
        return Response([_pago_payload(p) for p in pagos])


def _plan_elegido(request):
    plan = Plan.objects.filter(pk=request.data.get('plan_id'), activo=True).first()
    if plan is None:
        return None, Response({'detail': 'Elige un plan válido.'}, status=status.HTTP_400_BAD_REQUEST)
    return plan, None


class PagoTransferenciaView(APIView):
    """Registra la intención de pago por transferencia y devuelve los datos bancarios."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        empresa = _empresa_de(request)
        if empresa is None:
            return Response({'detail': 'Esta sesión no pertenece a una empresa.'}, status=status.HTTP_400_BAD_REQUEST)
        plan, error = _plan_elegido(request)
        if error:
            return error
        pago = crear_pago_transferencia(empresa.titular, plan)
        return Response({
            'pago': _pago_payload(pago),
            # Datos de la cuenta de la plataforma; se configuran en settings (PAGOS_TRANSFERENCIA)
            'datos_bancarios': settings.PAGOS_TRANSFERENCIA,
            'instruccion': f'Transfiere ${pago.monto:.2f} e indica en el concepto "Pago #{pago.pk} {empresa.slug}".',
        }, status=status.HTTP_201_CREATED)


class PagoStripeView(APIView):
    """Crea la sesión de Stripe Checkout para pagar el plan con tarjeta."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        empresa = _empresa_de(request)
        if empresa is None:
            return Response({'detail': 'Esta sesión no pertenece a una empresa.'}, status=status.HTTP_400_BAD_REQUEST)
        plan, error = _plan_elegido(request)
        if error:
            return error
        try:
            pago, url = crear_pago_stripe(empresa.titular, plan)
        except PagoError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({'pago': _pago_payload(pago), 'url': url}, status=status.HTTP_201_CREATED)


class StripeWebhookView(APIView):
    """Stripe avisa aquí cuando un pago con tarjeta se completó. No usa sesión: se valida la firma."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        firma = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        try:
            evento = stripe.Webhook.construct_event(request.body, firma, settings.STRIPE_WEBHOOK_SECRET)
        except Exception:
            return Response({'detail': 'Firma no válida.'}, status=status.HTTP_400_BAD_REQUEST)

        if evento['type'] == 'checkout.session.completed':
            sesion = evento['data']['object']
            if sesion.get('payment_status') == 'paid':
                pago = Pago.objects.filter(pk=sesion.get('client_reference_id'), metodo='stripe').first()
                if pago is not None:
                    activar_pago(pago.pk)
        return Response({'recibido': True})


class EmpresaNuevaView(APIView):
    """Agrega una empresa dentro de la base de la cuenta. Quien la crea recibe acceso como administrador."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        actual = _empresa_de(request)
        cuenta = cuenta_de(request.user, actual) if actual else None
        acceso = acceso_de(cuenta, actual) if cuenta else None
        if acceso is None or acceso.rol != 'Administrador' or not cuenta.activo:
            return Response({'detail': 'Solo el administrador de la cuenta puede crear empresas.'},
                            status=status.HTTP_403_FORBIDDEN)
        try:
            nombre = request.data.get('nombre', '')
            nueva = crear_empresa({
                'slug': str(request.data.get('slug', '')).strip().lower() or generar_slug(nombre),
                'nombre': nombre,
                'correo': cuenta.email,
                'modulos': request.data.get('modulos') or [],
            }, cuenta=actual)
        except RegistroError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        conceder(cuenta, nueva, 'Administrador')
        return Response({'empresa': nueva.slug, 'nombre': nueva.nombre}, status=status.HTTP_201_CREATED)
