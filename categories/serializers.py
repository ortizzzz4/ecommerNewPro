from rest_framework import serializers

from products.models import Product
from .models import Category


class ListCategory(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class CategorySerializer(serializers.ModelSerializer):
    productos = serializers.PrimaryKeyRelatedField(
        source='products', many=True, queryset=Product.objects.all(), required=False
    )

    class Meta:
        model = Category
        fields = ['id', 'title', 'description', 'productos']
