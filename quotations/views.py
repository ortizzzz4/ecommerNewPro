from rest_framework import viewsets, permissions
from .models import Quotation
from .serializers import QuotationSerializer
from users.permisos import PermisoPorModelo
from drf_spectacular.utils import extend_schema_view, extend_schema


@extend_schema_view(
    list=extend_schema(tags=['cotizaciones']),
    create=extend_schema(tags=['cotizaciones']),
    retrieve=extend_schema(tags=['cotizaciones']),
    update=extend_schema(tags=['cotizaciones']),
    partial_update=extend_schema(tags=['cotizaciones']),
    destroy=extend_schema(tags=['cotizaciones']),
)
class QuotationViewSet(viewsets.ModelViewSet):
    serializer_class   = QuotationSerializer
    permission_classes = [PermisoPorModelo]

    def get_queryset(self):
        # Quien tiene permiso de ver cotizaciones (PermisoPorModelo) ve todas.
        # Antes se filtraba por cliente=user, pero cliente es un Contact: daba error 500.
        return Quotation.objects.all().prefetch_related('items')

    def perform_create(self, serializer):
        serializer.save()
