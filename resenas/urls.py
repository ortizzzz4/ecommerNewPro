from django.urls import path

from .views import ResenaPublicasView

urlpatterns = [
    path('', ResenaPublicasView.as_view(), name='resenas_publicas'),
]
