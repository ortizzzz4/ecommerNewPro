from rest_framework.routers import DefaultRouter

from .views import ActividadViewSet, OportunidadViewSet

router = DefaultRouter()
router.register('oportunidades', OportunidadViewSet, basename='oportunidad')
router.register('actividades', ActividadViewSet, basename='actividad')

urlpatterns = router.urls
