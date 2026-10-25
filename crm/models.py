from django.conf import settings
from django.db import models

from contacts.models import Contact


class Oportunidad(models.Model):
    """Una venta en proceso: desde que llega el prospecto hasta que se gana o se pierde."""

    ETAPAS = [
        ('nueva', 'Nueva'),
        ('contactada', 'Contactada'),
        ('propuesta', 'Propuesta enviada'),
        ('ganada', 'Ganada'),
        ('perdida', 'Perdida'),
    ]

    titulo = models.CharField(max_length=150)
    contacto = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='oportunidades')
    nombre_prospecto = models.CharField(max_length=150, blank=True, help_text='Si todavía no es un contacto registrado')
    correo = models.EmailField(blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    etapa = models.CharField(max_length=20, choices=ETAPAS, default='nueva')
    valor = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    responsable = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                    on_delete=models.SET_NULL, related_name='oportunidades')
    fecha_cierre = models.DateField(null=True, blank=True)
    notas = models.TextField(blank=True)
    creada = models.DateTimeField(auto_now_add=True)
    actualizada = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creada']

    def __str__(self):
        return self.titulo

    @property
    def cliente_nombre(self):
        return self.contacto.nombre if self.contacto else self.nombre_prospecto


class Actividad(models.Model):
    """Algo que pasó con una oportunidad: una llamada, una reunión, un correo o una nota."""

    TIPOS = [
        ('llamada', 'Llamada'),
        ('reunion', 'Reunión'),
        ('correo', 'Correo'),
        ('nota', 'Nota'),
    ]

    oportunidad = models.ForeignKey(Oportunidad, on_delete=models.CASCADE, related_name='actividades')
    tipo = models.CharField(max_length=20, choices=TIPOS)
    descripcion = models.CharField(max_length=255)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f'{self.get_tipo_display()}: {self.descripcion}'
