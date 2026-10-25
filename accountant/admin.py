from django.contrib import admin

from .models import Accoun, Asiento, Cuenta, Partida


class PartidaInline(admin.TabularInline):
    model = Partida
    extra = 0


@admin.register(Cuenta)
class CuentaAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'nombre', 'tipo', 'acepta_movimientos']
    list_filter = ['tipo']
    search_fields = ['codigo', 'nombre']


@admin.register(Asiento)
class AsientoAdmin(admin.ModelAdmin):
    list_display = ['numero', 'fecha', 'descripcion', 'origen', 'referencia', 'estado']
    list_filter = ['origen', 'estado']
    search_fields = ['descripcion', 'referencia']
    inlines = [PartidaInline]


admin.site.register(Accoun)
