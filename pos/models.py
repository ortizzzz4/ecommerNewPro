from django.conf import settings
from django.db import models, transaction

from invoices.models import Invoice
from products.models import Product


class PrinterProfile(models.Model):
    CONEXION_CHOICES = [
        ('red', 'Red (IP y puerto, normalmente 9100)'),
        ('windows', 'Windows (nombre de la impresora instalada)'),
        ('dispositivo', 'Dispositivo (COM3 o /dev/usb/lp0)'),
    ]
    ANCHO_CHOICES = [(58, '58 mm'), (80, '80 mm')]
    CODEPAGE_CHOICES = [
        ('cp437', 'CP437 (original de IBM)'),
        ('cp850', 'CP850 (europeo)'),
        ('cp858', 'CP858 (incluye €, recomendado)'),
        ('cp1252', 'Windows-1252'),
    ]

    nombre = models.CharField(max_length=100)
    conexion = models.CharField(max_length=20, choices=CONEXION_CHOICES, default='red')
    host = models.CharField(max_length=100, blank=True, help_text='IP de la impresora (conexión de red)')
    puerto = models.PositiveIntegerField(default=9100)
    destino = models.CharField(
        max_length=200, blank=True,
        help_text='Nombre de la impresora en Windows, o ruta del dispositivo (COM3, /dev/usb/lp0)',
    )
    ancho_papel = models.PositiveSmallIntegerField(choices=ANCHO_CHOICES, default=80)
    codepage = models.CharField(max_length=10, choices=CODEPAGE_CHOICES, default='cp858')
    predeterminada = models.BooleanField(default=False)
    activa = models.BooleanField(default=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return self.nombre

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.predeterminada:
                PrinterProfile.objects.exclude(pk=self.pk).update(predeterminada=False)
            super().save(*args, **kwargs)


class CajaSesion(models.Model):
    """Turno de caja: se abre con un monto inicial y se cierra contando el efectivo."""

    cajero = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='cajas',
    )
    monto_inicial = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    desglose_inicial = models.JSONField(default=dict, blank=True)  # {"20": 3, "0.25": 4, ...}
    desglose_contado = models.JSONField(default=dict, blank=True)
    abierta = models.DateTimeField(auto_now_add=True)
    cerrada = models.DateTimeField(null=True, blank=True)
    # Al cerrar
    total_efectivo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_tarjeta = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_transferencia = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    esperado_efectivo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    monto_contado = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    diferencia = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ['-abierta']

    def __str__(self):
        return f'Caja {self.id} ({self.abierta:%d/%m/%Y %H:%M})'


class VentaPos(models.Model):
    METODOS = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta'),
        ('transferencia', 'Transferencia'),
    ]

    folio = models.CharField(max_length=30, unique=True, editable=False)
    cajero = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='ventas_pos',
    )
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    descuento_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    descuento_monto = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    impuesto_pct = models.DecimalField(max_digits=5, decimal_places=2, default=13)
    impuesto_monto = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    metodo_pago = models.CharField(max_length=20, choices=METODOS)
    monto_recibido = models.DecimalField(max_digits=10, decimal_places=2)
    cambio = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Documento fiscal generado al cobrar (vacío si solo fue ticket)
    factura = models.OneToOneField(
        Invoice, null=True, blank=True, on_delete=models.SET_NULL, related_name='venta_pos',
    )
    caja = models.ForeignKey(
        CajaSesion, null=True, blank=True, on_delete=models.PROTECT, related_name='ventas',
    )
    creada = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creada']
        permissions = [('use_pos', 'Puede usar el punto de venta')]

    def __str__(self):
        return self.folio


class LineaVentaPos(models.Model):
    venta = models.ForeignKey(VentaPos, on_delete=models.CASCADE, related_name='lineas')
    producto = models.ForeignKey(Product, on_delete=models.PROTECT)
    descripcion = models.CharField(max_length=200)
    cantidad = models.PositiveIntegerField()
    precio_unit = models.DecimalField(max_digits=8, decimal_places=2)

    @property
    def total_linea(self):
        return self.cantidad * self.precio_unit
