import uuid
from django.db import models
from django.contrib.auth import get_user_model
from quotations.models import Quotation, QuotationItem
from contacts.models import Contact


User = get_user_model()

class Invoice(models.Model):
    STATUS_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('pagada',    'Pagada'),
        ('anulada',   'Anulada'),
        ('vencida',   'Vencida'),
    ]

    TIPO_DOCUMENTO_CHOICES = [
        ('ticket', 'Ticket'),
        ('factura', 'Factura'),
        ('credito_fiscal', 'Crédito fiscal'),
    ]

    numero        = models.CharField(max_length=20, unique=True, blank=True)
    tipo_documento = models.CharField(max_length=20, choices=TIPO_DOCUMENTO_CHOICES, default='factura')
    cotizacion    = models.OneToOneField(Quotation, on_delete=models.SET_NULL,
                                         null=True, blank=True, related_name='factura')
    cliente = models.ForeignKey(
        Contact,                    
        on_delete=models.SET_NULL,
        null=True,
        related_name='facturas'
    )
    nombre_cliente = models.CharField(max_length=100, blank=True)
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendiente')
    descuento     = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    impuesto      = models.DecimalField(max_digits=5, decimal_places=2, default=13)  # IVA 13%
    nota          = models.TextField(blank=True)
    fecha_emision = models.DateField(auto_now_add=True)
    fecha_vence   = models.DateField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    # Facturación electrónica (ver invoices/fe.py)
    ESTADO_FE_CHOICES = [
        ('no_aplica', 'No aplica'),
        ('generado', 'Generado'),
        ('transmitido', 'Transmitido a Hacienda'),
        ('rechazado', 'Rechazado'),
    ]
    tipo_dte = models.CharField(max_length=2, blank=True)
    numero_control = models.CharField(max_length=40, blank=True)
    codigo_generacion = models.CharField(max_length=36, blank=True)
    estado_fe = models.CharField(max_length=20, choices=ESTADO_FE_CHOICES, default='no_aplica')

    def save(self, *args, **kwargs):
        if not self.numero:
            prefijos = {'ticket': 'TKT', 'credito_fiscal': 'CCF', 'factura': 'FAC'}
            prefijo = prefijos.get(self.tipo_documento, 'FAC')
            self.numero = f'{prefijo}-' + str(uuid.uuid4())[:8].upper()
        primera_vez = self.pk is None
        super().save(*args, **kwargs)
        if primera_vez:
            from .fe import asignar_documento_electronico
            asignar_documento_electronico(self)

    @property
    def subtotal(self):
        return sum(item.total_linea for item in self.items.all())

    @property
    def descuento_monto(self):
        return self.subtotal * (self.descuento / 100)

    @property
    def base_imponible(self):
        return self.subtotal - self.descuento_monto

    @property
    def impuesto_monto(self):
        return self.base_imponible * (self.impuesto / 100)

    @property
    def total(self):
        return self.base_imponible + self.impuesto_monto

    def __str__(self):
        return f'{self.numero} - {self.nombre_cliente or self.cliente}'


class InvoiceItem(models.Model):
    factura     = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    descripcion = models.CharField(max_length=200)       # nombre del producto al momento de facturar
    cantidad    = models.PositiveIntegerField(default=1)
    precio_unit = models.DecimalField(max_digits=8, decimal_places=2)

    @property
    def total_linea(self):
        return self.cantidad * self.precio_unit

    def __str__(self):
        return f'{self.cantidad} x {self.descripcion}'