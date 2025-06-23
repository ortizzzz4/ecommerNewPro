from rest_framework import serializers
from .models import Product

class ProductSerializers(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ('__all__')
        extra_kwargs = {
            'slug': {'required': False},  # Esto evita que Django lo pida en la solicitud
            'image': {'required': False, 'allow_null': True} 
        }
      

