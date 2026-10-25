from django.urls import path

from .views import CorreoPruebaView, EmpresaView

urlpatterns = [
    path('', EmpresaView.as_view(), name='empresa'),
    path('correo/probar/', CorreoPruebaView.as_view(), name='empresa_correo_probar'),
]
