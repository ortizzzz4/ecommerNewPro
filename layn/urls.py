"""layn URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.urls import include

from django.conf.urls.static import static
from django.conf import settings
from products.views import ProductApis
from rest_framework import routers

from promo_code.views import ListPromo
from categories.views import ListaApiCate

from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView


urlpatterns = [
  
    path('admin/', admin.site.urls),
    path('api/productos/', include('products.urls')),
    path('api/codigos/', include('promo_code.urls')),
    path('api/users/',include('users.urls')),
    path('api/cotizaciones/', include('quotations.urls')),
    path('api/facturas/', include('invoices.urls')),
    path('api/contactos/', include('contacts.urls')),
    path('api/pos/', include('pos.urls')),
    path('api/inventario/', include('categories.urls')),
    path('api/inventario/', include('inventario.urls')),
    path('api/empresa/', include('empresa.urls')),
    path('api/fe/', include('invoices.fe_urls')),
    path('api/usuarios/', include('users.gestion_urls')),
    path('api/tienda/', include('tienda.urls')),
    path('api/resenas/', include('resenas.urls')),
    path('api/tenants/', include('tenants.urls')),
    path('api/crm/', include('crm.urls')),
    path('api/contabilidad/', include('accountant.urls')),

    
    
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    # Optional UI:
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
   

]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root= settings.MEDIA_ROOT)

#+ static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

