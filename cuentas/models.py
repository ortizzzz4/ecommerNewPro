from django.db import models


class CuentaUsuario(models.Model):
    """Usuario de la cuenta. Vive en la base de datos de la cuenta (esquema 'cuenta'), así que la base
    guarda a todos sus usuarios, incluido el administrador. Tiene una sola contraseña para todas las empresas."""

    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(blank=True)
    nombre = models.CharField(max_length=150, blank=True)
    password = models.CharField(max_length=128)
    activo = models.BooleanField(default=True)
    creada = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['username']

    def __str__(self):
        return self.username


class AccesoEmpresa(models.Model):
    """Qué empresas de la base puede usar un usuario, y con qué rol en cada una.

    La empresa se guarda por identificador (slug): el registro de empresas está en la base maestra.
    """

    cuenta = models.ForeignKey(CuentaUsuario, on_delete=models.CASCADE, related_name='accesos')
    empresa_slug = models.CharField(max_length=40)
    rol = models.CharField(max_length=30, default='Vendedor')
    ultima_entrada = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['empresa_slug']
        constraints = [
            models.UniqueConstraint(fields=['cuenta', 'empresa_slug'], name='acceso_unico_por_empresa'),
        ]

    def __str__(self):
        return f'{self.cuenta.username} → {self.empresa_slug} ({self.rol})'
