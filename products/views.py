import requests
import json
from .models import Product
from rest_framework.generics import ListAPIView
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, DjangoModelPermissionsOrAnonReadOnly

from .serializers import ProductSerializers
# Create your views here.
from .models import Product

CANALES = {'pos': 'visible_pos', 'ventas': 'visible_ventas', 'compras': 'visible_compras', 'tienda': 'visible_tienda'}


class ProductApis(viewsets.ModelViewSet):
      serializer_class = ProductSerializers
      queryset = Product.objects.all()
      # Cualquiera puede ver el catálogo; crear, editar o borrar exige permisos del modelo
      permission_classes = [DjangoModelPermissionsOrAnonReadOnly]

      def get_queryset(self):
            # ?canal=pos|ventas|compras|tienda devuelve solo los productos visibles en ese canal
            queryset = Product.objects.all().order_by('title')
            canal = self.request.query_params.get('canal')
            if canal in CANALES:
                  queryset = queryset.filter(**{CANALES[canal]: True})
            return queryset

     # def guardarDatos(self):
      #    url =self.serializer_class
       #   file = "fixtures/datos.json"
        #  data=url
         # with open(file, "w") as fl:
          #      json.dump(data, fl)
           #     print(data)
            #    
             #   with open(file,"") as fls:
              #        json.load(data,fls)
            