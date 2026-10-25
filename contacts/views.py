from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema_view, extend_schema

from .models import Contact
from .serializers import ContactSerializer, ContactListSerializer
from users.permisos import PermisoPorModelo

@extend_schema_view(
    list=extend_schema(tags=['contactos']),
    create=extend_schema(tags=['contactos']),
    retrieve=extend_schema(tags=['contactos']),
    update=extend_schema(tags=['contactos']),
    partial_update=extend_schema(tags=['contactos']),
    destroy=extend_schema(tags=['contactos']),
)
class ContactViewSet(viewsets.ModelViewSet):
    queryset           = Contact.objects.all()
    permission_classes = [PermisoPorModelo]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['nombre', 'nit', 'email', 'telefono']
    ordering_fields    = ['nombre', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return ContactListSerializer
        return ContactSerializer

    @extend_schema(tags=['contactos'], summary='Listar solo clientes')
    @action(detail=False, methods=['get'], url_path='clientes')
    def clientes(self, request):
        qs = Contact.objects.filter(tipo__in=['cliente', 'ambos'], activo=True)
        return Response(ContactListSerializer(qs, many=True).data)

    @extend_schema(tags=['contactos'], summary='Listar solo proveedores')
    @action(detail=False, methods=['get'], url_path='proveedores')
    def proveedores(self, request):
        qs = Contact.objects.filter(tipo__in=['proveedor', 'ambos'], activo=True)
        return Response(ContactListSerializer(qs, many=True).data)