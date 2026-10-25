import re

from django.db import migrations


def normalizar(apps, schema_editor):
    User = apps.get_model('users', 'User')
    for usuario in User.objects.exclude(carnet__isnull=True).exclude(carnet=''):
        digitos = re.sub(r'\D', '', usuario.carnet)[:9] or None
        if digitos != usuario.carnet:
            User.objects.filter(pk=usuario.pk).update(carnet=digitos)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_user_carnet'),
    ]

    operations = [
        migrations.RunPython(normalizar, migrations.RunPython.noop),
    ]
