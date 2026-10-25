from rest_framework.routers import DefaultRouter
from .views import QuotationViewSet

router = DefaultRouter()
router.register(r'cotizaciones', QuotationViewSet, basename='cotizacion')

urlpatterns = router.urls