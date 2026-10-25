from django.shortcuts import render

# Create your views here.
from .serializers import ListCategory, CategorySerializer
from rest_framework import viewsets
from rest_framework.generics import ListAPIView
from .models import Category
from users.permisos import PermisoPorModelo


class ListaApiCate(ListAPIView):
    serializer_class= ListCategory
    queryset= Category.objects.all()

class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    queryset = Category.objects.prefetch_related('products').order_by('title')
    permission_classes = [PermisoPorModelo]
