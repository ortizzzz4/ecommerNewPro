from django.db import models
from categories.models import Category
from orders.models import Order
from django.db.models import Sum
from django.db.models.signals import post_save
from django.dispatch import receiver

# Create your models here.

class Accoun(models.Model):
    categoria=models.ManyToManyField(Category,max_length=50)
    total = models.DecimalField(max_digits=8, decimal_places=2)
    total_sum = models.DecimalField(max_digits=10, decimal_places=2)


   # def __str__(self):
   #     return self.total



    #@receiver(post_save, sender=Order)
    #def update_total_sum(sender, instance, created, **kwargs):
    #    if created:
    #        total_sum = Order.objects.aggregate(total_sum=models.Sum('total'))['total_sum']
    #        accoun_obj = Accoun.objects.first()
    #        if accoun_obj:
    #            accoun_obj.total = total_sum
    #            accoun_obj.save()
    #        else:
    #            Accoun.objects.create(total=total_sum, total_sum=total_sum)


class Cuenta(models.Model):
    """Cuenta del plan de cuentas. Las cuentas de detalle reciben movimientos; las agrupadoras solo suman."""

    TIPOS = [
        ('activo', 'Activo'),
        ('pasivo', 'Pasivo'),
        ('patrimonio', 'Patrimonio'),
        ('ingreso', 'Ingreso'),
        ('costo', 'Costo'),
        ('gasto', 'Gasto'),
    ]
    # Activos, costos y gastos aumentan con el debe; el resto aumenta con el haber
    TIPOS_DEUDORES = ('activo', 'costo', 'gasto')

    codigo = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=120)
    tipo = models.CharField(max_length=20, choices=TIPOS)
    padre = models.ForeignKey('self', null=True, blank=True, on_delete=models.PROTECT, related_name='hijas')
    acepta_movimientos = models.BooleanField(default=True, help_text='Desmárcala si es una cuenta agrupadora')

    class Meta:
        ordering = ['codigo']

    def __str__(self):
        return f'{self.codigo} {self.nombre}'

    @property
    def naturaleza(self):
        return 'deudora' if self.tipo in self.TIPOS_DEUDORES else 'acreedora'


class Asiento(models.Model):
    """Partida contable completa: sus movimientos (partidas) deben cuadrar entre debe y haber."""

    ESTADOS = [
        ('contabilizado', 'Contabilizado'),
        ('anulado', 'Anulado'),
    ]
    ORIGENES = [
        ('manual', 'Manual'),
        ('factura', 'Venta (factura)'),
        ('cobro', 'Cobro (factura)'),
    ]

    numero = models.PositiveIntegerField(editable=False)
    fecha = models.DateField()
    descripcion = models.CharField(max_length=200)
    origen = models.CharField(max_length=20, choices=ORIGENES, default='manual')
    referencia = models.CharField(max_length=40, blank=True, help_text='Ej. número de la factura')
    estado = models.CharField(max_length=20, choices=ESTADOS, default='contabilizado')
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['fecha', 'numero']
        indexes = [models.Index(fields=['origen', 'referencia'])]

    def save(self, *args, **kwargs):
        if self.pk is None and not self.numero:
            ultimo = Asiento.objects.aggregate(ultimo=models.Max('numero'))['ultimo'] or 0
            self.numero = ultimo + 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f'Partida #{self.numero} · {self.descripcion}'


class Partida(models.Model):
    """Línea de un asiento: una cuenta con un monto en el debe o en el haber."""

    asiento = models.ForeignKey(Asiento, on_delete=models.CASCADE, related_name='partidas')
    cuenta = models.ForeignKey(Cuenta, on_delete=models.PROTECT, related_name='partidas')
    descripcion = models.CharField(max_length=200, blank=True)
    debe = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    haber = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.cuenta.codigo} · D {self.debe} / H {self.haber}'
