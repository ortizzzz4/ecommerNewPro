from django.urls import path,include
from rest_framework import routers
from rest_framework.documentation import include_docs_urls

app_name = 'products'# solo a al app de products

from . import views

routers = routers.DefaultRouter()
routers.register(r'product',views.ProductApis,'products')


urlpatterns = [
     path('search', views.ProductSearchListView.as_view(), name='search'),
     path('<slug:slug>', views.ProductDetailView.as_view(), name='product'),
     path('api/v1/',include(routers.urls)),
    # path('docs/',include_docs_urls(title="Productos API"))
]

