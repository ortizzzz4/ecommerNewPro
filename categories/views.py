from django.shortcuts import render

# Create your views here.
from .serializers import ListCategory
from rest_framework.generics import ListAPIView
from .models import Category


class ListaApiCate(ListAPIView):
    serializer_class= ListCategory
    queryset= Category.objects.all()