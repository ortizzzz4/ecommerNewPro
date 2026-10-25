from django.contrib import admin, messages

from .models import EmpresaRegistrada, Pago, Plan
from .pagos import activar_pago


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'codigo', 'precio', 'dias', 'activo', 'orden']
    list_editable = ['precio', 'activo', 'orden']


@admin.register(EmpresaRegistrada)
class EmpresaRegistradaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'slug', 'correo', 'db_name', 'es_prueba', 'trial_hasta', 'plan', 'suscripcion_hasta']
    list_filter = ['plan', 'es_prueba']
    search_fields = ['nombre', 'slug', 'correo']
    readonly_fields = ['db_name', 'creada']


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ['id', 'empresa', 'plan', 'metodo', 'monto', 'estado', 'creado', 'confirmado_en']
    list_filter = ['estado', 'metodo']
    search_fields = ['empresa__slug', 'empresa__nombre', 'referencia']
    readonly_fields = ['empresa', 'plan', 'metodo', 'monto', 'referencia', 'creado', 'confirmado_en']
    actions = ['confirmar_pagos']

    @admin.action(description='Confirmar pago recibido (activa la suscripción)')
    def confirmar_pagos(self, request, queryset):
        confirmados = 0
        for pago in queryset.exclude(estado='pagado'):
            activar_pago(pago.pk)
            confirmados += 1
        self.message_user(request, f'{confirmados} pago(s) confirmado(s).', messages.SUCCESS)
