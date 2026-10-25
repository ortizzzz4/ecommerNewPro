from .contexto import MAESTRA, alias_activo, migrando_cuenta


class TenantRouter:
    """Las empresas registradas van a su base; el registro de empresas siempre va a la maestra.

    Sin empresa activa (tienda, administración), todo usa la base maestra.
    """

    def _alias(self, model):
        if model._meta.app_label == 'tenants':
            return MAESTRA
        return alias_activo()

    def db_for_read(self, model, **hints):
        return self._alias(model)

    def db_for_write(self, model, **hints):
        return self._alias(model)

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, **hints):
        if app_label == 'tenants':
            return db == MAESTRA
        if app_label == 'cuentas':
            # Usuarios y accesos de la cuenta viven solo en el esquema 'cuenta' de su base
            return db != MAESTRA and migrando_cuenta()
        return True
