from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Resena(models.Model):
    """Reseña de un cliente. Solo se muestra en el sitio cuando se publica."""

    nombre = models.CharField(max_length=100)
    cargo = models.CharField(max_length=100, blank=True)
    empresa = models.CharField(max_length=100, blank=True)
    calificacion = models.PositiveSmallIntegerField(
        default=5, validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    texto = models.TextField()
    foto = models.ImageField(upload_to='resenas/', blank=True, null=True)
    publicada = models.BooleanField(default=False, help_text='Solo las publicadas aparecen en el sitio')
    creada = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creada']
        verbose_name = 'reseña'
        verbose_name_plural = 'reseñas'

    def __str__(self):
        return f'{self.nombre} ({self.calificacion}★)'
