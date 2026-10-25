from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Contact(models.Model):
    TIPO_CHOICES = [
        ('cliente',    'Cliente'),
        ('proveedor',  'Proveedor'),
        ('ambos',      'Cliente y Proveedor'),
    ]
    TIPO_PERSONA = [
        ('natural',  'Persona Natural'),
        ('juridica', 'Persona Jurídica'),
    ]

    # Relación opcional con usuario del sistema
    usuario       = models.OneToOneField(User, on_delete=models.SET_NULL,
                                          null=True, blank=True, related_name='contacto')
    tipo          = models.CharField(max_length=20, choices=TIPO_CHOICES, default='cliente')
    tipo_persona  = models.CharField(max_length=20, choices=TIPO_PERSONA, default='natural')

    # Datos generales
    nombre        = models.CharField(max_length=150)
    nombre_fiscal = models.CharField(max_length=150, blank=True)  # razón social
    nit           = models.CharField(max_length=30, blank=True, unique=True, null=True)  # NIT / DUI
    nrc           = models.CharField(max_length=30, blank=True, null=True)               # para empresas SV

    # Contacto
    email         = models.EmailField(blank=True)
    telefono      = models.CharField(max_length=20, blank=True)
    telefono_alt  = models.CharField(max_length=20, blank=True)

    # Dirección
    direccion     = models.TextField(blank=True)
    municipio     = models.CharField(max_length=100, blank=True)
    departamento  = models.CharField(max_length=100, blank=True)
    pais          = models.CharField(max_length=100, default='El Salvador')

    # Comercial
    limite_credito   = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    dias_credito     = models.PositiveIntegerField(default=0)  # días de plazo de pago
    descuento_defecto = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    activo        = models.BooleanField(default=True)
    es_demo       = models.BooleanField(default=False, editable=False)
    nota          = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.nombre} ({self.get_tipo_display()})'