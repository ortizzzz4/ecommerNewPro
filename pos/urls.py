from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AbrirCajonView, CajaAbrirView, CajaActualView, CajaCerrarView, CajasListaView,
    DesbloqueoPosView, ImpresoraViewSet, ProductosPosView, VentaPosViewSet,
)

router = DefaultRouter()
router.register('impresoras', ImpresoraViewSet, basename='impresora')
router.register('ventas', VentaPosViewSet, basename='venta')

urlpatterns = [
    path('', include(router.urls)),
    path('caja/abrir-cajon/', AbrirCajonView.as_view(), name='abrir_cajon'),
    path('desbloqueo/', DesbloqueoPosView.as_view(), name='desbloqueo'),
    path('productos/', ProductosPosView.as_view(), name='productos'),
    path('caja/actual/', CajaActualView.as_view(), name='caja_actual'),
    path('caja/abrir/', CajaAbrirView.as_view(), name='caja_abrir'),
    path('caja/cerrar/', CajaCerrarView.as_view(), name='caja_cerrar'),
    path('cajas/', CajasListaView.as_view(), name='cajas'),
]
