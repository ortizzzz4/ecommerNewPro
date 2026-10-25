from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet

router = DefaultRouter()
router.register(r'facturas', InvoiceViewSet, basename='factura')

urlpatterns = router.urls