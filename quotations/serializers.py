from rest_framework import serializers
from .models import Quotation, QuotationItem
from products.models import Product

class QuotationItemSerializer(serializers.ModelSerializer):
    total_linea   = serializers.ReadOnlyField()
    producto_nombre = serializers.CharField(source='producto.title', read_only=True)

    class Meta:
        model  = QuotationItem
        fields = ['id', 'producto', 'producto_nombre', 'cantidad', 'precio_unit', 'total_linea']


class QuotationSerializer(serializers.ModelSerializer):
    items    = QuotationItemSerializer(many=True)
    subtotal = serializers.ReadOnlyField()
    total    = serializers.ReadOnlyField()

    class Meta:
        model  = Quotation
        fields = ['id', 'codigo', 'cliente', 'status',
                  'descuento', 'nota', 'valida_hasta', 'subtotal', 'total',
                  'items', 'created_at']
        extra_kwargs = {
            'cliente': {'required': False, 'allow_null': True},
            'codigo':  {'read_only': True},
        }

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        cotizacion = Quotation.objects.create(**validated_data)
        for item in items_data:
            QuotationItem.objects.create(cotizacion=cotizacion, **item)
        return cotizacion

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', [])
        # Actualiza campos de la cotización
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        # Reemplaza los items
        if items_data:
            instance.items.all().delete()
            for item in items_data:
                QuotationItem.objects.create(cotizacion=instance, **item)
        return instance