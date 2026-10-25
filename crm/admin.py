from django.contrib import admin

from .models import Actividad, Oportunidad


class ActividadInline(admin.TabularInline):
    model = Actividad
    extra = 0


@admin.register(Oportunidad)
class OportunidadAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'cliente_nombre', 'etapa', 'valor', 'responsable', 'creada']
    list_filter = ['etapa']
    search_fields = ['titulo', 'nombre_prospecto', 'contacto__nombre']
    inlines = [ActividadInline]
