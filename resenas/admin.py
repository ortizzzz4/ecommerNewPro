from django.contrib import admin

from .models import Resena


@admin.register(Resena)
class ResenaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'empresa', 'calificacion', 'publicada', 'creada']
    list_editable = ['publicada']
    list_filter = ['publicada', 'calificacion']
    search_fields = ['nombre', 'empresa', 'texto']
