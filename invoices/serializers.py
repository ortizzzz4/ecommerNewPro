from rest_framework import serializers
from .models import Invoice, InvoiceItem
from quotations.models import Quotation

class InvoiceItemSerializer(serializers.ModelSerializer):
    total_linea = serializers.ReadOnlyField()

    class Meta:
        model  = InvoiceItem
        fields = ['id', 'descripcion', 'cantidad', 'precio_unit', 'total_linea']


class InvoiceSerializer(serializers.ModelSerializer):
    items           = InvoiceItemSerializer(many=True, read_only=True)
    subtotal        = serializers.ReadOnlyField()
    descuento_monto = serializers.ReadOnlyField()
    base_imponible  = serializers.ReadOnlyField()
    impuesto_monto  = serializers.ReadOnlyField()
    total           = serializers.ReadOnlyField()

    class Meta:
        model  = Invoice
        fields = ['id', 'numero', 'cotizacion', 'cliente', 'nombre_cliente',
                  'tipo_documento', 'tipo_dte', 'numero_control', 'codigo_generacion', 'estado_fe',
                  'status', 'descuento', 'impuesto', 'nota',
                  'fecha_emision', 'fecha_vence',
                  'subtotal', 'descuento_monto', 'base_imponible',
                  'impuesto_monto', 'total', 'items', 'created_at']
        read_only_fields = ['numero', 'fecha_emision']


class FacturarDesdeCotizacionSerializer(serializers.Serializer):
    """Genera una factura a partir de una cotización aprobada"""
    cotizacion_id = serializers.IntegerField()
    impuesto      = serializers.DecimalField(max_digits=5, decimal_places=2, default=13)
    fecha_vence   = serializers.DateField(required=False)
    nota          = serializers.CharField(required=False, allow_blank=True)