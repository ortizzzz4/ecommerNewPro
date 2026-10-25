from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema_view, extend_schema

from .models import Invoice, InvoiceItem
from .serializers import InvoiceSerializer, FacturarDesdeCotizacionSerializer
from quotations.models import Quotation
from users.permisos import PermisoPorModelo

@extend_schema_view(
    list=extend_schema(tags=['facturas']),
    create=extend_schema(tags=['facturas']),
    retrieve=extend_schema(tags=['facturas']),
    update=extend_schema(tags=['facturas']),
    partial_update=extend_schema(tags=['facturas']),
    destroy=extend_schema(tags=['facturas']),
)
class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class   = InvoiceSerializer
    permission_classes = [PermisoPorModelo]

    def get_queryset(self):
        # Quien tiene permiso de ver facturas (PermisoPorModelo) ve todas.
        # Antes se filtraba por cliente=user, pero cliente es un Contact: daba error 500.
        return Invoice.objects.all().prefetch_related('items')

    @extend_schema(
        tags=['facturas'],
        request=FacturarDesdeCotizacionSerializer,
        responses=InvoiceSerializer,
        summary='Generar factura desde una cotización aprobada'
    )
    @action(detail=False, methods=['post'], url_path='desde-cotizacion')
    def desde_cotizacion(self, request):
        serializer = FacturarDesdeCotizacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cotizacion_id = serializer.validated_data['cotizacion_id']

        # Validaciones
        try:
            cotizacion = Quotation.objects.prefetch_related('items__producto').get(
                id=cotizacion_id
            )
        except Quotation.DoesNotExist:
            return Response({'error': 'Cotización no encontrada'}, status=404)

        if cotizacion.status != 'aprobada':
            return Response(
                {'error': f'La cotización está en estado "{cotizacion.status}". Debe estar aprobada.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if hasattr(cotizacion, 'factura'):
            return Response(
                {'error': 'Esta cotización ya fue facturada', 'factura_id': cotizacion.factura.id},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Crear factura
        factura = Invoice.objects.create(
            cotizacion    = cotizacion,
            cliente       = cotizacion.cliente,
           
            descuento     = cotizacion.descuento,
            impuesto      = serializer.validated_data.get('impuesto', 13),
            fecha_vence   = serializer.validated_data.get('fecha_vence'),
            nota          = serializer.validated_data.get('nota', ''),
        )

        # Copiar items de la cotización
        for item in cotizacion.items.all():
            InvoiceItem.objects.create(
                factura     = factura,
                descripcion = item.producto.title,
                cantidad    = item.cantidad,
                precio_unit = item.precio_unit,
            )

        # Marcar cotización como facturada
        cotizacion.status = 'aprobada'
        cotizacion.save()

        return Response(InvoiceSerializer(factura).data, status=status.HTTP_201_CREATED)

    @extend_schema(tags=['facturas'], summary='Marcar factura como pagada')
    @action(detail=True, methods=['patch'], url_path='marcar-pagada')
    def marcar_pagada(self, request, pk=None):
        factura = self.get_object()
        if factura.status == 'anulada':
            return Response({'error': 'No se puede pagar una factura anulada'}, status=400)
        factura.status = 'pagada'
        factura.save()
        return Response(InvoiceSerializer(factura).data)

    @extend_schema(tags=['facturas'], summary='Anular factura')
    @action(detail=True, methods=['patch'], url_path='anular')
    def anular(self, request, pk=None):
        factura = self.get_object()
        if factura.status == 'pagada':
            return Response({'error': 'No se puede anular una factura ya pagada'}, status=400)
        factura.status = 'anulada'
        factura.save()
        return Response(InvoiceSerializer(factura).data)