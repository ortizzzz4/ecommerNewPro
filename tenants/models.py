from datetime import timedelta

from django.db import models
from django.utils import timezone

DIAS_DE_PRUEBA = 30


class Plan(models.Model):
    """Plan que una empresa puede contratar después de la prueba. Lo administra la plataforma."""

    codigo = models.SlugField(max_length=40, unique=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=200, blank=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    dias = models.PositiveIntegerField(default=30, help_text='Duración del pago en días')
    activo = models.BooleanField(default=True)
    orden = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['orden', 'precio']

    def __str__(self):
        return f'{self.nombre} (${self.precio})'


class EmpresaRegistrada(models.Model):
    """Una empresa registrada. Vive en la base maestra y apunta a su propia base de datos."""

    slug = models.SlugField(max_length=40, unique=True, help_text='Identificador para iniciar sesión')
    nombre = models.CharField(max_length=150)
    correo = models.EmailField()
    # Base de datos de la cuenta: puede ser compartida por varias empresas de la misma cuenta
    db_name = models.CharField(max_length=63)
    # Esquema de PostgreSQL dentro de esa base: 'public' para la primera empresa, emp_<slug> para las demás
    esquema = models.CharField(max_length=63, default='public')
    modulos = models.JSONField(default=list)
    trial_hasta = models.DateTimeField()
    plan = models.ForeignKey(Plan, null=True, blank=True, on_delete=models.SET_NULL, related_name='empresas')
    suscripcion_hasta = models.DateTimeField(null=True, blank=True)
    bloqueada = models.BooleanField(default=False, help_text='La plataforma la bloquea: no puede entrar ni registrar')
    es_prueba = models.BooleanField(default=False, help_text='Empresa de pruebas: no vence y se puede eliminar')
    creada = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']
        verbose_name = 'empresa'
        verbose_name_plural = 'empresas'

    def __str__(self):
        return f'{self.nombre} ({self.slug})'

    @property
    def titular(self):
        """Empresa principal de la base del cliente. La prueba, la suscripción y los pagos son de la base:
        se guardan en su titular y valen para todas las empresas que comparten esa base."""
        empresas = list(EmpresaRegistrada.objects.filter(db_name=self.db_name).order_by('pk'))
        return next((e for e in empresas if e.esquema == 'public'), empresas[0])

    def pagos_de_la_base(self):
        return Pago.objects.filter(empresa__db_name=self.db_name)

    @staticmethod
    def fin_de_prueba(desde):
        return desde + timedelta(days=DIAS_DE_PRUEBA)

    @property
    def suscripcion_activa(self):
        return self.suscripcion_hasta is not None and timezone.now() < self.suscripcion_hasta

    @property
    def vencida(self):
        """Sin prueba ni suscripción vigentes: solo puede consultar, no registrar."""
        if self.es_prueba:
            return False
        return not self.suscripcion_activa and timezone.now() > self.trial_hasta


    @property
    def fin_de_acceso(self):
        """Hasta cuándo puede usar el sistema: la suscripción si la tiene, si no la prueba."""
        if self.suscripcion_activa:
            return self.suscripcion_hasta
        return self.trial_hasta

    @property
    def dias_restantes(self):
        return max((self.fin_de_acceso - timezone.now()).days, 0)

    @property
    def estado(self):
        if self.bloqueada:
            return 'bloqueada'
        if self.suscripcion_activa:
            return 'activa'
        if timezone.now() <= self.trial_hasta:
            return 'prueba'
        return 'vencida'


class Pago(models.Model):
    """Intento de pago de un plan. Con tarjeta se confirma con el webhook de Stripe;
    con transferencia lo confirma la plataforma al verla en su banco."""

    METODOS = [
        ('stripe', 'Tarjeta (Stripe)'),
        ('transferencia', 'Transferencia bancaria'),
    ]
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('pagado', 'Pagado'),
        ('rechazado', 'Rechazado'),
    ]

    empresa = models.ForeignKey(EmpresaRegistrada, on_delete=models.CASCADE, related_name='pagos')
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name='pagos')
    metodo = models.CharField(max_length=20, choices=METODOS)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    referencia = models.CharField(max_length=120, blank=True, help_text='Id de la sesión de Stripe o número de transferencia')
    creado = models.DateTimeField(auto_now_add=True)
    confirmado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-creado']

    def __str__(self):
        return f'Pago #{self.pk} · {self.empresa.slug} · {self.plan.nombre} · {self.get_estado_display()}'
