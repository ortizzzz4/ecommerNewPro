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

from products.views import ProductListView
from orders.views import OrderViewSele
from promo_code.views import ListPromo
from categories.views import ListaApiCate

from . import views


urlpatterns = [
  
    path('', ProductListView.as_view(), name='index' ),
    path('usuarios/login', views.login_view, name='login' ),
    path('usuarios/logout', views.logout_view, name='logout' ),
    path('usuarios/registro', views.register, name='register' ),
    path('admin/', admin.site.urls),
    path('productos/', include('products.urls')),
    path('carrito/', include('carts.urls' )),
    path('orden/', include('orders.urls')),
    path('direcciones/', include('shipping_addresses.urls')),
    path('codigos/', include('promo_code.urls')),
    path('pagos/', include('biling_profiles.urls')),
    path('users/',include('users.urls')),
    
   

]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root= settings.MEDIA_ROOT)

#+ static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

