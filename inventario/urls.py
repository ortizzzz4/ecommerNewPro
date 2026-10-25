from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CompraViewSet, ComponentesView, MovimientoViewSet, RecepcionViewSet

router = DefaultRouter()
router.register('movimientos', MovimientoViewSet, basename='movimiento')
router.register('compras', CompraViewSet, basename='compra')
router.register('recepciones', RecepcionViewSet, basename='recepcion')

urlpatterns = router.urls + [
    path('productos/<int:pk>/componentes/', ComponentesView.as_view(), name='componentes'),
]
