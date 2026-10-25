from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .gestion import MiPinView, MiUsuarioView, PermisosDisponiblesView, PinUsuarioView, RolViewSet, UsuarioViewSet

router = DefaultRouter()
router.register('usuarios', UsuarioViewSet, basename='usuario')
router.register('roles', RolViewSet, basename='rol')

urlpatterns = [
    path('', include(router.urls)),
    path('yo/', MiUsuarioView.as_view(), name='mi_usuario'),
    path('permisos/', PermisosDisponiblesView.as_view(), name='permisos'),
    path('yo/pin/', MiPinView.as_view(), name='mi_pin'),
    path('usuarios/<int:pk>/pin/', PinUsuarioView.as_view(), name='pin_usuario'),
]
