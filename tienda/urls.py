from django.urls import path

from . import views

urlpatterns = [
    path('configuracion/', views.StripeConfigView.as_view(), name='configuracion'),
    path('carrito/', views.CartView.as_view(), name='carrito'),
    path('carrito/productos/<int:product_id>/', views.CartItemView.as_view(), name='carrito_producto'),
    path('pagos/', views.BilingProfilesView.as_view(), name='pagos'),
    path('pedidos/', views.OrderView.as_view(), name='pedidos'),
    path('pedidos/<int:pk>/pagar/', views.OrderPayView.as_view(), name='pedido_pagar'),
]
