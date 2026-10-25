"""Bases de datos y esquemas de las empresas.

Cada cuenta tiene UNA base de datos. Dentro de esa base, cada empresa vive en su propio esquema
de PostgreSQL, así sus registros (productos, facturas, clientes...) no se mezclan con los de otra
empresa de la misma cuenta. La primera empresa de una base usa el esquema 'public', que es donde
ya estaban los datos cuando solo existía una empresa por base.
"""

import copy
import threading
from contextlib import contextmanager

import psycopg2
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core.management import call_command
from django.db import connections
from psycopg2 import sql

from .contexto import MAESTRA, aplicando_cuenta, usando

PUBLICO = 'public'
ESQUEMA_CUENTA = 'cuenta'  # usuarios y accesos de la cuenta, en la misma base

_cuentas_listas = set()

_cerrojo = threading.Lock()


def nombre_base(slug):
    """Nombre de la base de una cuenta nueva: tenant_<slug> con guiones bajos."""
    return f"tenant_{slug.replace('-', '_')}"


def nombre_esquema(slug):
    """Esquema de una empresa que se agrega a una base que ya existe."""
    return f"emp_{slug.replace('-', '_')}"


def _conectar_servidor():
    cfg = settings.DATABASES[MAESTRA]
    conexion = psycopg2.connect(
        dbname='postgres', user=cfg['USER'], password=cfg['PASSWORD'],
        host=cfg['HOST'], port=cfg['PORT'],
    )
    conexion.autocommit = True  # CREATE/DROP DATABASE no pueden ir dentro de una transacción
    return conexion


def crear_base_de_datos(nombre):
    conexion = _conectar_servidor()
    try:
        with conexion.cursor() as cur:
            cur.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(nombre)))
    finally:
        conexion.close()


def eliminar_base_de_datos(nombre):
    _cuentas_listas.discard(nombre)
    alias = alias_de(nombre)
    if alias in connections.settings:
        connections[alias].close()
        del connections.settings[alias]
    conexion = _conectar_servidor()
    try:
        with conexion.cursor() as cur:
            cur.execute(sql.SQL('DROP DATABASE IF EXISTS {}').format(sql.Identifier(nombre)))
    finally:
        conexion.close()


def alias_de(nombre):
    return f'empresa_{nombre}'


def registrar(nombre):
    """Da de alta la base en la conexión de Django para poder usarla en esta misma ejecución."""
    alias = alias_de(nombre)
    with _cerrojo:
        if alias not in connections.settings:
            cfg = copy.deepcopy(connections.settings[MAESTRA])
            cfg['NAME'] = nombre
            connections.settings[alias] = cfg
    return alias


def crear_esquema(nombre_db, esquema):
    alias = registrar(nombre_db)
    with connections[alias].cursor() as cur:
        cur.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(esquema)))


def eliminar_esquema(nombre_db, esquema):
    """Borra un esquema con todos sus registros. Nunca toca los de otra empresa."""
    alias = registrar(nombre_db)
    fijar_esquema(alias, PUBLICO)
    with connections[alias].cursor() as cur:
        cur.execute(sql.SQL('DROP SCHEMA IF EXISTS {} CASCADE').format(sql.Identifier(esquema)))


def fijar_esquema(alias, esquema):
    """Hace que las consultas de esta conexión vean solo las tablas del esquema indicado."""
    with connections[alias].cursor() as cur:
        cur.execute(sql.SQL('SET search_path TO {}').format(sql.Identifier(esquema)))
    # Los tipos de contenido y permisos tienen ids distintos en cada esquema: no reutilizar la caché
    ContentType.objects.clear_cache()


def _search_path(alias):
    with connections[alias].cursor() as cur:
        cur.execute('SHOW search_path')
        return cur.fetchone()[0]


@contextmanager
def en_esquema(alias, esquema):
    """Activa una base y un esquema para el bloque. Al salir deja el esquema que había antes."""
    with usando(alias):
        anterior = _search_path(alias)
        fijar_esquema(alias, esquema)
        try:
            yield alias
        finally:
            with connections[alias].cursor() as cur:
                cur.execute(sql.SQL('SET search_path TO {}').format(sql.SQL(anterior)))
            ContentType.objects.clear_cache()


@contextmanager
def en_empresa(empresa):
    """Activa la base y el esquema de una empresa registrada."""
    with en_esquema(registrar(empresa.db_name), empresa.esquema) as alias:
        yield alias


def asegurar_esquema_cuenta(nombre):
    """Crea el esquema 'cuenta' de la base si falta y aplica sus tablas (usuarios y accesos)."""
    alias = registrar(nombre)
    with connections[alias].cursor() as cur:
        cur.execute(sql.SQL('CREATE SCHEMA IF NOT EXISTS {}').format(sql.Identifier(ESQUEMA_CUENTA)))
    with en_esquema(alias, ESQUEMA_CUENTA), aplicando_cuenta():
        call_command('migrate', 'cuentas', database=alias, interactive=False, verbosity=0)
    _cuentas_listas.add(nombre)


@contextmanager
def en_cuenta(nombre):
    """Activa el esquema 'cuenta' de la base indicada, donde viven los usuarios de la cuenta."""
    if nombre not in _cuentas_listas:
        asegurar_esquema_cuenta(nombre)
    with en_esquema(registrar(nombre), ESQUEMA_CUENTA):
        yield


def migrar(nombre, esquema=PUBLICO):
    alias = registrar(nombre)
    with en_esquema(alias, esquema):
        call_command('migrate', database=alias, interactive=False, verbosity=0)
    asegurar_esquema_cuenta(nombre)
    return alias
