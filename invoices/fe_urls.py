from django.urls import path

from .fe_views import DteView, TransmitirView

urlpatterns = [
    path('facturas/<int:pk>/dte/', DteView.as_view(), name='fe_dte'),
    path('facturas/<int:pk>/transmitir/', TransmitirView.as_view(), name='fe_transmitir'),
]
