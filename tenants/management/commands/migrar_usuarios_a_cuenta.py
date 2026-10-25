from django.core.management.base import BaseCommand

from tenants.bases import en_empresa
from tenants.cuentas import acceso_de, cuenta_por_usuario, conceder, reflejar_desde_empresa, rol_de
from tenants.models import EmpresaRegistrada


class Command(BaseCommand):
    help = 'Pasa a la cuenta de su base los usuarios de cada empresa que todavía no la tienen.'

    def handle(self, *args, **options):
        from django.contrib.auth import get_user_model

        for empresa in EmpresaRegistrada.objects.all():
            try:
                with en_empresa(empresa):
                    usuarios = list(get_user_model().objects.all())
                for usuario in usuarios:
                    cuenta = cuenta_por_usuario(empresa.db_name, usuario.username)
                    if cuenta is None:
                        reflejar_desde_empresa(usuario, empresa)
                        self.stdout.write(f'{empresa.slug}: {usuario.username} pasó a la cuenta')
                    elif acceso_de(cuenta, empresa) is None and usuario.is_active:
                        # Ya tenía cuenta (por otra empresa): solo se le da acceso a esta, sin cambiar su contraseña
                        conceder(cuenta, empresa, rol_de(usuario))
                        self.stdout.write(f'{empresa.slug}: acceso para {usuario.username}')
            except Exception as exc:  # una base con error no detiene a las demás
                self.stdout.write(self.style.ERROR(f'{empresa.slug}: {exc}'))
