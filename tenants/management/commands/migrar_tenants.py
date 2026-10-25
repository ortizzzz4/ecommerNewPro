from django.core.management.base import BaseCommand

from tenants.bases import migrar
from tenants.models import EmpresaRegistrada


class Command(BaseCommand):
    help = 'Aplica las migraciones pendientes a la base de datos de cada empresa registrada.'

    def handle(self, *args, **options):
        for empresa in EmpresaRegistrada.objects.all():
            try:
                migrar(empresa.db_name, empresa.esquema)
                self.stdout.write(self.style.SUCCESS(f'{empresa.slug}: al día'))
            except Exception as exc:  # una empresa con error no detiene a las demás
                self.stdout.write(self.style.ERROR(f'{empresa.slug}: {exc}'))
