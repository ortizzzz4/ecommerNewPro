import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('contacts', '0002_contact_es_demo'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Oportunidad',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titulo', models.CharField(max_length=150)),
                ('nombre_prospecto', models.CharField(blank=True, help_text='Si todavía no es un contacto registrado', max_length=150)),
                ('correo', models.EmailField(blank=True, max_length=254)),
                ('telefono', models.CharField(blank=True, max_length=20)),
                ('etapa', models.CharField(choices=[('nueva', 'Nueva'), ('contactada', 'Contactada'), ('propuesta', 'Propuesta enviada'), ('ganada', 'Ganada'), ('perdida', 'Perdida')], default='nueva', max_length=20)),
                ('valor', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('fecha_cierre', models.DateField(blank=True, null=True)),
                ('notas', models.TextField(blank=True)),
                ('creada', models.DateTimeField(auto_now_add=True)),
                ('actualizada', models.DateTimeField(auto_now=True)),
                ('contacto', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='oportunidades', to='contacts.contact')),
                ('responsable', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='oportunidades', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-creada']},
        ),
        migrations.CreateModel(
            name='Actividad',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(choices=[('llamada', 'Llamada'), ('reunion', 'Reunión'), ('correo', 'Correo'), ('nota', 'Nota')], max_length=20)),
                ('descripcion', models.CharField(max_length=255)),
                ('fecha', models.DateTimeField(auto_now_add=True)),
                ('oportunidad', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='actividades', to='crm.oportunidad')),
                ('usuario', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-fecha']},
        ),
    ]
