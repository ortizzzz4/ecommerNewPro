import re
from rest_framework.permissions import DjangoModelPermissions


class PermisoPorModelo(DjangoModelPermissions):
    """Permisos de Django por modelo, también para leer (GET exige view_<modelo>)."""

    perms_map = {
        **DjangoModelPermissions.perms_map,
        'GET': ['%(app_label)s.view_%(model_name)s'],
        'HEAD': ['%(app_label)s.view_%(model_name)s'],
        'OPTIONS': [],
    }


def normalizar_carnet(valor):
    """El escáner del DUI devuelve más caracteres que el número: se quedan los 9 dígitos."""
    digitos = re.sub(r'\D', '', str(valor or ''))
    return digitos[:9]


def pin_valido(pin):
    return isinstance(pin, str) and pin.isdigit() and 4 <= len(pin) <= 6
