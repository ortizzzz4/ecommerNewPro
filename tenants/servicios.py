import logging
import re
import unicodedata

from django.core.management import call_command
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .bases import (
    PUBLICO, crear_base_de_datos, crear_esquema, eliminar_base_de_datos, eliminar_esquema, en_esquema,
    migrar, nombre_base, nombre_esquema,
)
from .models import EmpresaRegistrada
from .modulos import MODULOS, MODULOS_BASE

logger = logging.getLogger(__name__)

SLUG_VALIDO = re.compile(r'^[a-z0-9][a-z0-9-]{2,39}$')


class RegistroError(Exception):
    pass


def validar_datos(datos, con_usuario=True):
    """Devuelve la lista de módulos elegidos, o lanza RegistroError con el motivo.

    Con `con_usuario=False` no pide usuario ni contraseña: la empresa se agrega a una cuenta que ya existe.
    """
    if not SLUG_VALIDO.match(datos.get('slug', '')):
        raise RegistroError('El identificador debe tener de 3 a 40 letras minúsculas, números o guiones.')
    if EmpresaRegistrada.objects.filter(slug=datos['slug']).exists():
        raise RegistroError('Ya existe una empresa con ese identificador.')
    if not datos.get('nombre', '').strip():
        raise RegistroError('Escribe el nombre de la empresa.')
    try:
        validate_email(datos.get('correo', ''))
    except ValidationError:
        raise RegistroError('El correo no es válido.')
    if con_usuario:
        if not datos.get('usuario', '').strip():
            raise RegistroError('Escribe el usuario administrador.')
        if len(datos.get('password', '')) < 8:
            raise RegistroError('La contraseña debe tener al menos 8 caracteres.')

    elegidos = list(datos.get('modulos') or [])
    if datos.get('es_prueba') and not elegidos:
        # Una empresa de pruebas sirve para probar todo, así que trae todos los módulos
        elegidos = list(MODULOS)
    desconocidos = [m for m in elegidos if m not in MODULOS]
    if desconocidos:
        raise RegistroError(f'Módulos no válidos: {", ".join(desconocidos)}.')
    if not elegidos:
        raise RegistroError('Elige al menos un módulo.')
    return elegidos + [m for m in MODULOS_BASE if m not in elegidos]


def crear_empresa(datos, cuenta=None):
    """Registra una empresa.

    - Sin `cuenta`: cuenta nueva. Crea su base de datos, su usuario administrador y su configuración.
    - Con `cuenta` (una empresa que ya existe): la nueva empresa va dentro de la misma base, en su
      propio esquema. No crea usuario: quien la crea recibe acceso con su cuenta central.

    Con `es_prueba` la empresa no vence y se carga con datos de demostración.
    Todo o nada: si algo falla, se borra lo que se alcanzó a crear.
    """
    modulos = validar_datos(datos, con_usuario=cuenta is None)
    es_prueba = bool(datos.get('es_prueba'))

    if cuenta is None:
        db_name, esquema = nombre_base(datos['slug']), PUBLICO
    else:
        db_name, esquema = cuenta.db_name, nombre_esquema(datos['slug'])

    with transaction.atomic():
        empresa = EmpresaRegistrada.objects.create(
            slug=datos['slug'],
            nombre=datos['nombre'].strip(),
            correo=datos['correo'],
            db_name=db_name,
            esquema=esquema,
            modulos=modulos,
            # Una empresa nueva dentro de una base hereda la prueba, la suscripción y el bloqueo de la base
            trial_hasta=cuenta.trial_hasta if cuenta else EmpresaRegistrada.fin_de_prueba(timezone.now()),
            suscripcion_hasta=cuenta.suscripcion_hasta if cuenta else None,
            plan=cuenta.plan if cuenta else None,
            bloqueada=cuenta.bloqueada if cuenta else False,
            es_prueba=es_prueba,
        )

    try:
        if cuenta is None:
            crear_base_de_datos(db_name)
        else:
            crear_esquema(db_name, esquema)
        alias = migrar(db_name, esquema)
        with en_esquema(alias, esquema):
            _configurar_empresa(empresa, es_prueba, datos, crear_admin=cuenta is None)
    except Exception:
        logger.exception('No se pudo crear la empresa %s', empresa.slug)
        if cuenta is None:
            eliminar_base_de_datos(db_name)
        else:
            eliminar_esquema(db_name, esquema)
        empresa.delete()
        raise RegistroError('No se pudo crear la empresa. Intenta de nuevo.')

    return empresa


def _configurar_empresa(empresa, es_prueba, datos, crear_admin):
    from empresa.demo import activar_datos_demo
    from empresa.models import Empresa as DatosEmpresa
    from users.models import User

    DatosEmpresa.objects.update_or_create(
        pk=1, defaults={'nombre_comercial': empresa.nombre, 'datos_demo': es_prueba},
    )
    call_command('crear_roles', verbosity=0)
    if crear_admin:
        User.objects.create_superuser(
            username=datos['usuario'].strip(), email=datos['correo'], password=datos['password'],
        )
    if es_prueba:
        activar_datos_demo()


def generar_slug(nombre):
    """Identificador a partir del nombre de la empresa, sin repetir ninguno existente: 'Ferretería El Sol' -> 'ferreteria-el-sol'."""
    base = unicodedata.normalize('NFKD', nombre or '').encode('ascii', 'ignore').decode().lower()
    base = re.sub(r'[^a-z0-9]+', '-', base).strip('-')[:36] or 'empresa'
    if len(base) < 3:
        base = f'{base}-empresa'
    candidato, n = base, 2
    while EmpresaRegistrada.objects.filter(slug=candidato).exists():
        candidato = f'{base}-{n}'
        n += 1
    return candidato
