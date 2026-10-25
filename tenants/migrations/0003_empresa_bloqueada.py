from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0002_planes_pagos'),
    ]

    operations = [
        migrations.AddField(
            model_name='empresaregistrada',
            name='bloqueada',
            field=models.BooleanField(default=False, help_text='La plataforma la bloquea: no puede entrar ni registrar'),
        ),
    ]
