from django.db import models, transaction


class Empresa(models.Model):
    """Datos de la empresa. Solo existe un registro (pk=1)."""

    AMBIENTES = [
        ('00', 'Pruebas'),
        ('01', 'Producción'),
    ]

    nombre_comercial = models.CharField(max_length=150, blank=True)
    razon_social = models.CharField(max_length=200, blank=True)
    nit = models.CharField(max_length=20, blank=True)
    nrc = models.CharField(max_length=20, blank=True)
    giro = models.CharField(max_length=200, blank=True, help_text='Actividad económica')
    direccion = models.TextField(blank=True)
    departamento = models.CharField(max_length=100, blank=True)
    municipio = models.CharField(max_length=100, blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    correo = models.EmailField(blank=True)
    # Dominio web propio de la empresa (ej. miempresa.com). Cada base de empresa guarda el suyo.
    dominio = models.CharField(max_length=120, blank=True, help_text='Ej. miempresa.com, sin http:// ni www.')

    # Correo saliente de la empresa (facturas, cotizaciones, avisos). Cada base tiene el suyo.
    SEGURIDAD_CORREO = [
        ('tls', 'STARTTLS (puerto 587)'),
        ('ssl', 'SSL/TLS directo (puerto 465)'),
        ('ninguna', 'Sin cifrado'),
    ]
    correo_servidor = models.CharField(max_length=120, blank=True, help_text='Ej. smtp.gmail.com')
    correo_puerto = models.PositiveIntegerField(default=587)
    correo_seguridad = models.CharField(max_length=10, choices=SEGURIDAD_CORREO, default='tls')
    correo_usuario = models.CharField(max_length=150, blank=True)
    # Se guarda en la base de la empresa y nunca se devuelve por la API
    correo_clave = models.CharField(max_length=255, blank=True)
    correo_remitente = models.EmailField(blank=True)
    correo_nombre_remitente = models.CharField(max_length=120, blank=True)

    logo = models.ImageField(upload_to='empresa/', blank=True, null=True)
    pie_ticket = models.CharField(max_length=200, default='Gracias por su compra')

    # Facturación electrónica
    # Datos de demostración (productos, categorías y contactos de ejemplo)
    datos_demo = models.BooleanField(default=False, help_text='Cargar datos de ejemplo para probar el sistema')

    facturacion_electronica = models.BooleanField(default=False)
    ambiente = models.CharField(max_length=2, choices=AMBIENTES, default='00')
    codigo_establecimiento = models.CharField(max_length=4, blank=True, help_text='Ej. M001')
    codigo_punto_venta = models.CharField(max_length=4, blank=True, help_text='Ej. P001')
    correlativo_factura = models.PositiveIntegerField(default=0, editable=False)
    correlativo_ccf = models.PositiveIntegerField(default=0, editable=False)

    class Meta:
        verbose_name_plural = 'empresa'

    def __str__(self):
        return self.nombre_comercial or 'Empresa'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def obtener(cls):
        empresa, _ = cls.objects.get_or_create(pk=1)
        return empresa

    def siguiente_numero_control(self, tipo_dte):
        """Número de control del DTE: DTE-<tipo>-<establecimiento><punto>-<correlativo de 15 dígitos>."""
        with transaction.atomic():
            empresa = Empresa.objects.select_for_update().get(pk=1)
            campo = 'correlativo_ccf' if tipo_dte == '03' else 'correlativo_factura'
            setattr(empresa, campo, getattr(empresa, campo) + 1)
            empresa.save(update_fields=[campo])
            correlativo = getattr(empresa, campo)
        return f'DTE-{tipo_dte}-{empresa.codigo_establecimiento}{empresa.codigo_punto_venta}-{correlativo:015d}'

    def faltantes_fe(self):
        """Datos que faltan para poder emitir facturas electrónicas."""
        faltan = []
        for campo, etiqueta in [
            ('nit', 'NIT'), ('nrc', 'NRC'), ('razon_social', 'razón social'), ('giro', 'giro'),
            ('codigo_establecimiento', 'código de establecimiento'), ('codigo_punto_venta', 'código de punto de venta'),
        ]:
            if not getattr(self, campo):
                faltan.append(etiqueta)
        return faltan
