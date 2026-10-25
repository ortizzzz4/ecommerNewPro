"""Empresa activa de la petición en curso. Por defecto es la base maestra ('default')."""

from contextlib import contextmanager
from contextvars import ContextVar

MAESTRA = 'default'

_alias_activo = ContextVar('alias_empresa', default=MAESTRA)


def alias_activo():
    return _alias_activo.get()


@contextmanager
def usando(alias):
    token = _alias_activo.set(alias)
    try:
        yield alias
    finally:
        _alias_activo.reset(token)


_migrando_cuenta = ContextVar('migrando_cuenta', default=False)


def migrando_cuenta():
    """True mientras se aplican las tablas de la cuenta: solo entonces el router las permite."""
    return _migrando_cuenta.get()


@contextmanager
def aplicando_cuenta():
    token = _migrando_cuenta.set(True)
    try:
        yield
    finally:
        _migrando_cuenta.reset(token)
