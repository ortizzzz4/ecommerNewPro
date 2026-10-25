import uuid
from django.db import models
from django.contrib.auth import get_user_model
from products.models import Product
from contacts.models import Contact


User = get_user_model()

class Quotation(models.Model):
    STATUS_CHOICES = [
        ('borrador',  'Borrador'),
        ('enviada',   'Enviada'),
        ('aprobada',  'Aprobada'),
        ('rechazada', 'Rechazada'),
        ('vencida',   'Vencida'),
    ]

    codigo         = models.CharField(max_length=20, unique=True, blank=True)
    cliente = models.ForeignKey(
        Contact,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'tipo__in': ['cliente', 'ambos']},
        related_name='cotizaciones'
    )
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='borrador')
    descuento      = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # porcentaje
    nota           = models.TextField(blank=True)
    valida_hasta   = models.DateField(null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.codigo:
            self.codigo = 'COT-' + str(uuid.uuid4())[:8].upper()
        super().save(*args, **kwargs)

    @property
    def subtotal(self):
        return sum(item.total_linea for item in self.items.all())

    @property
    def total(self):
        descuento_monto = self.subtotal * (self.descuento / 100)
        return self.subtotal - descuento_monto

    def __str__(self):
        return f'{self.codigo} - {self.nombre_cliente or self.cliente}'


class QuotationItem(models.Model):
    cotizacion  = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='items')
    producto    = models.ForeignKey(Product, on_delete=models.PROTECT)
    cantidad    = models.PositiveIntegerField(default=1)
    precio_unit = models.DecimalField(max_digits=8, decimal_places=2)  # precio al momento de cotizar

    @property
    def total_linea(self):
        return self.cantidad * self.precio_unit

    def save(self, *args, **kwargs):
        # Auto-toma el precio del producto si no se especifica
        if not self.precio_unit:
            self.precio_unit = self.producto.price
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.cantidad} x {self.producto.title}'