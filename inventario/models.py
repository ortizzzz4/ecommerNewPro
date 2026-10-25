from django.conf import settings
from django.db import models

from contacts.models import Contact
from products.models import Product


class ComponenteProducto(models.Model):
    """Un combo o kit está formado por otros productos (sus componentes)."""

    padre = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='componentes')
    componente = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='usado_en')
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['padre', 'componente'], name='componente_unico_por_padre'),
        ]

    def __str__(self):
        return f'{self.padre} → {self.cantidad} x {self.componente}'


class MovimientoInventario(models.Model):
    TIPO_CHOICES = [
        ('entrada', 'Entrada (compra o recepción)'),
        ('ajuste', 'Ajuste manual'),
        ('venta', 'Venta'),
    ]

    producto = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='movimientos')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    cantidad = models.DecimalField(max_digits=12, decimal_places=2, help_text='Positiva suma, negativa resta')
    motivo = models.CharField(max_length=200, blank=True)
    referencia = models.CharField(max_length=100, blank=True, help_text='Factura, ticket o pedido relacionado')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado']

    def __str__(self):
        return f'{self.tipo} {self.cantidad} de {self.producto}'


class Compra(models.Model):
    """Compra a un proveedor. Al crearla se genera su recepción pendiente."""

    proveedor = models.ForeignKey(Contact, on_delete=models.PROTECT, related_name='compras')
    notas = models.CharField(max_length=200, blank=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado']
        verbose_name_plural = 'compras'

    def __str__(self):
        return f'Compra #{self.pk} a {self.proveedor}'


class CompraLinea(models.Model):
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE, related_name='lineas')
    producto = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='lineas_compra')
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    costo_unitario = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f'{self.cantidad} x {self.producto} en compra #{self.compra_id}'


class Recepcion(models.Model):
    """Ingreso físico de la mercadería de una compra. Las existencias entran al confirmarla."""

    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('recibida', 'Recibida'),
    ]

    compra = models.OneToOneField(Compra, on_delete=models.CASCADE, related_name='recepcion')
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='pendiente')
    recibida_en = models.DateTimeField(null=True, blank=True)
    recibida_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                     on_delete=models.SET_NULL, related_name='recepciones_confirmadas')
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado']

    def __str__(self):
        return f'Recepción de compra #{self.compra_id} ({self.get_estado_display()})'


class RecepcionLinea(models.Model):
    recepcion = models.ForeignKey(Recepcion, on_delete=models.CASCADE, related_name='lineas')
    producto = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='lineas_recepcion')
    cantidad_esperada = models.DecimalField(max_digits=12, decimal_places=2)
    cantidad_recibida = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True,
                                            help_text='Lo que realmente llegó; vacío mientras esté pendiente')

    def __str__(self):
        return f'{self.cantidad_esperada} x {self.producto} en recepción de compra #{self.recepcion.compra_id}'
