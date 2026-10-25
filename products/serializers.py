from rest_framework import serializers
from categories.models import Category
from .models import Product

class ProductSerializers(serializers.ModelSerializer):
    # Categorías a las que pertenece el producto (se administran desde Inventario)
    categorias = serializers.PrimaryKeyRelatedField(
        source='category_set', many=True, queryset=Category.objects.all(), required=False
    )

    class Meta:
        model = Product
        fields = ('__all__')
        extra_kwargs = {
            'slug': {'required': False},  # Esto evita que Django lo pida en la solicitud
            'image': {'required': False, 'allow_null': True},
            'stock': {'read_only': True},  # el stock solo cambia con movimientos de inventario
        }

    def validate_codigo_barras(self, valor):
        # Vacío = sin código (None), para no chocar con el campo único
        valor = (valor or '').strip()
        return valor or None
