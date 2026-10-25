from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import Resena
from .serializers import ResenaSerializer


class ResenaPublicasView(generics.ListAPIView):
    """Reseñas publicadas, para el sitio web. No requiere sesión."""
    serializer_class = ResenaSerializer
    permission_classes = [AllowAny]
    pagination_class = None
    queryset = Resena.objects.filter(publicada=True)
