"""Desbloqueo del punto de venta con PIN.

El PIN se valida una vez y devuelve un token firmado (8 horas). Las ventas,
la lista de productos y la apertura del cajón exigen ese token en la cabecera X-POS-Desbloqueo.
"""
from django.core import signing
from django.core.cache import cache
from rest_framework.permissions import BasePermission

SALT = 'pos-desbloqueo'
DURACION = 8 * 60 * 60
MAX_INTENTOS = 5
BLOQUEO_SEGUNDOS = 5 * 60
CABECERA = 'HTTP_X_POS_DESBLOQUEO'


def generar_token(user):
    return signing.dumps({'uid': user.id}, salt=SALT)


def validar_token(request):
    token = request.META.get(CABECERA)
    if not token:
        return False
    try:
        datos = signing.loads(token, salt=SALT, max_age=DURACION)
    except signing.BadSignature:
        return False
    return datos.get('uid') == request.user.id


def clave_intentos(user):
    return f'pos-pin-intentos-{user.id}'


def bloqueado(user):
    return cache.get(clave_intentos(user), 0) >= MAX_INTENTOS


def registrar_fallo(user):
    clave = clave_intentos(user)
    cache.set(clave, cache.get(clave, 0) + 1, BLOQUEO_SEGUNDOS)


def limpiar_fallos(user):
    cache.delete(clave_intentos(user))


class PosDesbloqueado(BasePermission):
    message = 'El punto de venta está bloqueado. Ingresa tu PIN.'

    def has_permission(self, request, view):
        return request.user.is_authenticated and validar_token(request)
