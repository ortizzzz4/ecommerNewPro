from django.urls import path,include
from rest_framework import routers
from rest_framework.documentation import include_docs_urls

app_name = 'products'# solo a al app de products

from . import views

routers = routers.DefaultRouter()
routers.register(r'product',views.ProductApis,'products')


urlpatterns = [
     path('v1/',include(routers.urls)),
    # path('docs/',include_docs_urls(title="Productos API"))
]

