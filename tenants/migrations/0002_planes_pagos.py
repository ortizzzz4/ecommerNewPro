import django.db.models.deletion
from django.db import migrations, models


def plan_inicial(apps, schema_editor):
    # Plan de ejemplo: ajusta el precio desde el admin de Django
    Plan = apps.get_model('tenants', 'Plan')
    Plan.objects.get_or_create(
        codigo='mensual',
        defaults={'nombre': 'Plan mensual', 'descripcion': 'Acceso completo a los módulos contratados',
                  'precio': 30, 'dias': 30, 'orden': 1},
    )


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Plan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('codigo', models.SlugField(max_length=40, unique=True)),
                ('nombre', models.CharField(max_length=100)),
                ('descripcion', models.CharField(blank=True, max_length=200)),
                ('precio', models.DecimalField(decimal_places=2, max_digits=10)),
                ('dias', models.PositiveIntegerField(default=30, help_text='Duración del pago en días')),
                ('activo', models.BooleanField(default=True)),
                ('orden', models.PositiveSmallIntegerField(default=0)),
            ],
            options={'ordering': ['orden', 'precio']},
        ),
        migrations.RemoveField(
            model_name='empresaregistrada',
            name='suscripcion_activa',
        ),
        migrations.AddField(
            model_name='empresaregistrada',
            name='plan',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                    related_name='empresas', to='tenants.plan'),
        ),
        migrations.AddField(
            model_name='empresaregistrada',
            name='suscripcion_hasta',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='Pago',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('metodo', models.CharField(choices=[('stripe', 'Tarjeta (Stripe)'), ('transferencia', 'Transferencia bancaria')], max_length=20)),
                ('estado', models.CharField(choices=[('pendiente', 'Pendiente'), ('pagado', 'Pagado'), ('rechazado', 'Rechazado')], default='pendiente', max_length=20)),
                ('monto', models.DecimalField(decimal_places=2, max_digits=10)),
                ('referencia', models.CharField(blank=True, help_text='Id de la sesión de Stripe o número de transferencia', max_length=120)),
                ('creado', models.DateTimeField(auto_now_add=True)),
                ('confirmado_en', models.DateTimeField(blank=True, null=True)),
                ('empresa', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pagos', to='tenants.empresaregistrada')),
                ('plan', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='pagos', to='tenants.plan')),
            ],
            options={'ordering': ['-creado']},
        ),
        migrations.RunPython(plan_inicial, migrations.RunPython.noop),
    ]
