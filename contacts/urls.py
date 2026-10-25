from rest_framework.routers import DefaultRouter
from .views import ContactViewSet

router = DefaultRouter()
router.register(r'contactos', ContactViewSet, basename='contacto')

urlpatterns = router.urls