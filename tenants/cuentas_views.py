import re

from django.contrib.auth.hashers import make_password
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cuentas.models import CuentaUsuario

from .bases import en_cuenta
from .cuentas import CuentaError, accesos_de, aplicar_accesos, cuenta_de, sincronizar

USUARIO_VALIDO = re.compile(r'^[A-Za-z0-9._-]{3,150}$')


def _actual(request):
    """(empresa de la sesión, cuenta) solo si quien la usa es administrador de la cuenta; si no, (empresa, None)."""
    actual = getattr(request, 'empresa', None)
    if actual is None:
        return None, None
    cuenta = cuenta_de(request.user, actual)
    if cuenta is None or not request.user.is_superuser or not cuenta.activo:
        return actual, None
    return actual, cuenta


def _payload(cuenta, db_name):
    return {
        'id': cuenta.id,
        'username': cuenta.username,
        'email': cuenta.email,
        'nombre': cuenta.nombre,
        'activo': cuenta.activo,
        'accesos': [{'empresa': e.slug, 'nombre': e.nombre, 'rol': a.rol} for a, e in accesos_de(cuenta, db_name)],
    }


def _sin_permiso():
    return Response({'detail': 'Solo el administrador de la cuenta puede administrar usuarios.'},
                    status=status.HTTP_403_FORBIDDEN)


class UsuariosCuentaView(APIView):
    """Usuarios de la cuenta y en qué empresas trabaja cada uno. Solo para el administrador."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        actual, cuenta = _actual(request)
        if cuenta is None:
            return _sin_permiso()
        with en_cuenta(actual.db_name):
            cuentas = list(CuentaUsuario.objects.all())
        return Response([_payload(c, actual.db_name) for c in cuentas])

    def post(self, request):
        actual, cuenta = _actual(request)
        if cuenta is None:
            return _sin_permiso()
        datos = request.data
        username = str(datos.get('username', '')).strip()
        password = datos.get('password', '')
        if not USUARIO_VALIDO.match(username):
            return Response({'detail': 'El usuario debe tener de 3 a 150 letras, números, puntos, guiones o guiones bajos.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 8:
            return Response({'detail': 'La contraseña debe tener al menos 8 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)
        with en_cuenta(actual.db_name):
            if CuentaUsuario.objects.filter(username=username).exists():
                return Response({'detail': 'Ya existe un usuario con ese nombre en tu cuenta.'},
                                status=status.HTTP_400_BAD_REQUEST)
            nueva = CuentaUsuario.objects.create(
                username=username, email=str(datos.get('email', '')).strip(),
                nombre=str(datos.get('nombre', '')).strip(), password=make_password(password),
            )
        try:
            aplicar_accesos(nueva, actual.db_name, datos.get('accesos') or [])
        except CuentaError as exc:
            with en_cuenta(actual.db_name):
                nueva.delete()
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_payload(nueva, actual.db_name), status=status.HTTP_201_CREATED)


class UsuarioCuentaDetailView(APIView):
    """Cambia los accesos, el estado, el nombre o la contraseña de un usuario de la cuenta."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        actual, admin = _actual(request)
        if admin is None:
            return _sin_permiso()
        datos = request.data
        with en_cuenta(actual.db_name):
            usuario = CuentaUsuario.objects.filter(pk=pk).first()
        if usuario is None:
            return Response({'detail': 'El usuario no existe.'}, status=status.HTTP_404_NOT_FOUND)
        if usuario.pk == admin.pk and datos.get('activo') is False:
            return Response({'detail': 'No puedes desactivar tu propia cuenta.'}, status=status.HTTP_400_BAD_REQUEST)

        if datos.get('password'):
            if len(datos['password']) < 8:
                return Response({'detail': 'La contraseña debe tener al menos 8 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)
            usuario.password = make_password(datos['password'])
        if 'activo' in datos:
            usuario.activo = bool(datos['activo'])
        if 'nombre' in datos:
            usuario.nombre = str(datos['nombre']).strip()
        with en_cuenta(actual.db_name):
            usuario.save()
        try:
            if 'accesos' in datos:
                aplicar_accesos(usuario, actual.db_name, datos.get('accesos') or [])
            else:
                for acceso, empresa in accesos_de(usuario, actual.db_name):
                    sincronizar(usuario, empresa)
        except CuentaError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_payload(usuario, actual.db_name))
