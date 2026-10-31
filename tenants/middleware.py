from django.http import JsonResponse
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from .bases import en_empresa
from .models import EmpresaRegistrada
from .modulos import modulo_de_ruta

RUTAS_SIEMPRE_ABIERTAS = ('/api/tenants/', '/api/users/users/current/', '/api/users/users/refresh/')
MENSAJE_BLOQUEADA = 'Tu base de datos se encuentra bloqueada. Contacta a soporte para reactivarla.'
MENSAJE_VENCIDA = 'Tu base de datos ha expirado. Activa una suscripción para volver a usarla.'


def _empresa_del_token(request):
    """Si el token lleva la empresa en su claim 'empresa', devuelve su slug; si no, None."""
    cabecera = request.META.get('HTTP_AUTHORIZATION', '')
    if not cabecera.startswith('Bearer '):
        return None
    try:
        return AccessToken(cabecera.split(' ', 1)[1]).get('empresa')
    except TokenError:
        return None


class EmpresaMiddleware:
    """Activa la base de la empresa de la petición y aplica sus reglas.

    - Sin token de empresa (tienda, administración): no hace nada, usa la base maestra.
    - Módulo no contratado: 403 en sus rutas de API.
    - Prueba vencida sin suscripción: solo se permite consultar (GET).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        slug = _empresa_del_token(request)
        if not slug:
            return self.get_response(request)

        empresa = EmpresaRegistrada.objects.filter(slug=slug).first()
        if empresa is None:
            return JsonResponse({'detail': 'La empresa ya no existe.'}, status=401)

        request.empresa = empresa
        with en_empresa(empresa):
            bloqueo = self._bloqueo(request, empresa)
            if bloqueo:
                return bloqueo
            return self.get_response(request)

    def _bloqueo(self, request, empresa):
        # Planes, pagos, cuenta y sesión siguen disponibles: desde ahí se reactiva la base
        if request.path.startswith(RUTAS_SIEMPRE_ABIERTAS):
            return None
        if empresa.bloqueada:
            return JsonResponse({'detail': MENSAJE_BLOQUEADA, 'bloqueo': 'bloqueada'}, status=403)
        if empresa.vencida:
            return JsonResponse({'detail': MENSAJE_VENCIDA, 'bloqueo': 'vencida'}, status=402)
        modulo = modulo_de_ruta(request.path)
        if modulo and modulo not in empresa.modulos:
            return JsonResponse({'detail': 'Tu empresa no tiene contratado este módulo.'}, status=403)
        return None
