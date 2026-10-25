"""Cuentas de usuario de una base: una contraseña, acceso a una o varias empresas de esa base.

Los usuarios y sus accesos viven en el esquema 'cuenta' de la base (CuentaUsuario y AccesoEmpresa).
Dentro de cada empresa existe también un usuario (en su esquema), que es el que tiene los grupos y
permisos de esa empresa. Esta parte copia la cuenta a ese usuario cada vez que hace falta.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from django.contrib.auth.models import Group

from cuentas.models import AccesoEmpresa, CuentaUsuario

from .bases import en_cuenta, en_empresa
from .models import EmpresaRegistrada

ROLES = ['Administrador', 'Vendedor', 'Cajero', 'Compras', 'Contador']


class CuentaError(Exception):
    pass


def cuenta_de(usuario, empresa):
    """La cuenta del usuario de la sesión dentro de la base de la empresa, o None."""
    if usuario is None or not usuario.is_authenticated:
        return None
    return cuenta_por_usuario(empresa.db_name, usuario.username)


def cuenta_por_usuario(db_name, username):
    with en_cuenta(db_name):
        return CuentaUsuario.objects.filter(username=username).first()


def accesos_de(cuenta, db_name):
    """Accesos de la cuenta, con la empresa de cada uno: [(acceso, empresa), ...]."""
    with en_cuenta(db_name):
        accesos = list(AccesoEmpresa.objects.filter(cuenta=cuenta))
    empresas = EmpresaRegistrada.objects.in_bulk([a.empresa_slug for a in accesos], field_name='slug')
    return [(a, empresas[a.empresa_slug]) for a in accesos if a.empresa_slug in empresas]


def acceso_de(cuenta, empresa):
    with en_cuenta(empresa.db_name):
        return AccesoEmpresa.objects.filter(cuenta=cuenta, empresa_slug=empresa.slug).first()


def sincronizar(cuenta, empresa):
    """Copia la cuenta al usuario de la empresa: misma contraseña, rol y estado. Devuelve ese usuario."""
    acceso = acceso_de(cuenta, empresa)
    with en_empresa(empresa):
        usuario, _ = get_user_model().objects.get_or_create(username=cuenta.username)
        usuario.email = cuenta.email
        usuario.first_name = cuenta.nombre
        usuario.password = cuenta.password
        usuario.is_active = cuenta.activo and acceso is not None
        usuario.is_superuser = bool(acceso and acceso.rol == 'Administrador')
        usuario.is_staff = usuario.is_superuser
        usuario.save()
        if acceso and acceso.rol != 'Administrador':
            usuario.groups.set(Group.objects.filter(name=acceso.rol))
        else:
            usuario.groups.clear()
        return usuario


def conceder(cuenta, empresa, rol):
    if rol not in ROLES:
        raise CuentaError('El rol no existe.')
    with en_cuenta(empresa.db_name):
        acceso, _ = AccesoEmpresa.objects.update_or_create(
            cuenta=cuenta, empresa_slug=empresa.slug, defaults={'rol': rol},
        )
    sincronizar(cuenta, empresa)
    return acceso


def revocar(cuenta, empresa):
    with en_cuenta(empresa.db_name):
        AccesoEmpresa.objects.filter(cuenta=cuenta, empresa_slug=empresa.slug).delete()
    with en_empresa(empresa):
        get_user_model().objects.filter(username=cuenta.username).update(
            is_active=False, is_superuser=False, is_staff=False,
        )


def aplicar_accesos(cuenta, db_name, accesos):
    """Deja exactamente los accesos indicados: [{'empresa': slug, 'rol': rol}, ...] de la misma base."""
    deseados = {}
    for item in accesos:
        empresa = EmpresaRegistrada.objects.filter(slug=item.get('empresa'), db_name=db_name).first()
        if empresa is None:
            raise CuentaError('Hay una empresa que no existe en tu base de datos.')
        if item.get('rol') not in ROLES:
            raise CuentaError('Hay un rol que no existe.')
        deseados[empresa.slug] = (empresa, item['rol'])

    with en_cuenta(db_name):
        actuales = list(AccesoEmpresa.objects.filter(cuenta=cuenta).values_list('empresa_slug', flat=True))
    for slug in actuales:
        if slug not in deseados:
            empresa = EmpresaRegistrada.objects.filter(slug=slug, db_name=db_name).first()
            if empresa is not None:
                revocar(cuenta, empresa)
            else:
                with en_cuenta(db_name):
                    AccesoEmpresa.objects.filter(cuenta=cuenta, empresa_slug=slug).delete()
    for empresa, rol in deseados.values():
        conceder(cuenta, empresa, rol)


def verificar_clave(cuenta, empresa, password):
    """Contraseña correcta según la cuenta. Si la cuenta quedó desactualizada (se cambió dentro de la
    empresa antes de existir la cuenta), se acepta la del usuario de la empresa y se actualiza."""
    if check_password(password, cuenta.password):
        return True
    with en_empresa(empresa):
        usuario = get_user_model().objects.filter(username=cuenta.username).first()
        if usuario is not None and usuario.is_active and usuario.check_password(password):
            cuenta.password = usuario.password
            with en_cuenta(empresa.db_name):
                cuenta.save(update_fields=['password'])
            return True
    return False


def cuenta_desde_usuario_de_empresa(usuario, empresa):
    """Usuarios que existían antes de las cuentas: se crea su cuenta con la misma contraseña y su acceso."""
    with en_cuenta(empresa.db_name):
        cuenta = CuentaUsuario.objects.create(
            username=usuario.username, email=usuario.email, nombre=usuario.first_name, password=usuario.password,
        )
        AccesoEmpresa.objects.create(
            cuenta=cuenta, empresa_slug=empresa.slug, rol='Administrador' if usuario.is_superuser else 'Vendedor',
        )
    return cuenta


def rol_de(usuario):
    """Rol de la empresa a partir de los grupos del usuario: el primero que sea un rol conocido."""
    if usuario.is_superuser:
        return 'Administrador'
    nombres = set(usuario.groups.values_list('name', flat=True))
    return next((rol for rol in ROLES if rol in nombres), 'Vendedor')


def reflejar_desde_empresa(usuario, empresa):
    """Lo que se cambió en la pantalla de usuarios de la empresa (acceso, rol, contraseña) pasa a la cuenta.

    Si el usuario todavía no tiene cuenta, se crea. La contraseña nueva aplica en todas las empresas de la cuenta.
    """
    cuenta = cuenta_por_usuario(empresa.db_name, usuario.username)
    if cuenta is None:
        with en_cuenta(empresa.db_name):
            cuenta = CuentaUsuario.objects.create(
                username=usuario.username, email=usuario.email, nombre=usuario.first_name, password=usuario.password,
            )
    elif cuenta.password != usuario.password:
        with en_cuenta(empresa.db_name):
            cuenta.password = usuario.password
            cuenta.save(update_fields=['password'])

    if usuario.is_active:
        conceder(cuenta, empresa, rol_de(usuario))
    else:
        revocar(cuenta, empresa)
    for _, otra in accesos_de(cuenta, empresa.db_name):
        if otra.slug != empresa.slug:
            sincronizar(cuenta, otra)
    return cuenta
