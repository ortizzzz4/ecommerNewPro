from django.contrib import admin

from .models  import PromoCode
# Register your models here.


class PromoCodeAdmin(admin.ModelAdmin):
    exclude=['code'] #quitar el campo code del formulario

admin.site.register(PromoCode, PromoCodeAdmin)