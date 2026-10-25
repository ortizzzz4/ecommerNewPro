from django.urls import path

from .admin_views import (
    ConfirmarPagoAdminView, EmpresaAdminDetailView, EmpresaPruebaView, EmpresasAdminView, ExtenderPruebaView,
    PagosAdminView,
)
from .cuentas_views import UsuarioCuentaDetailView, UsuariosCuentaView
from .views import (
    CambiarEmpresaView, EmpresaNuevaView, LoginEmpresaView, MiEmpresaView, MisEmpresasView, ModulosCatalogoView, PagoStripeView,
    PagoTransferenciaView, PagosView, PlanesView, RegistroEmpresaView, StripeWebhookView,
)

urlpatterns = [
    path('modulos/', ModulosCatalogoView.as_view(), name='tenants_modulos'),
    path('registro/', RegistroEmpresaView.as_view(), name='tenants_registro'),
    path('login/', LoginEmpresaView.as_view(), name='tenants_login'),
    path('mi-empresa/', MiEmpresaView.as_view(), name='tenants_mi_empresa'),
    path('mis-empresas/', MisEmpresasView.as_view(), name='tenants_mis_empresas'),
    path('cambiar-empresa/', CambiarEmpresaView.as_view(), name='tenants_cambiar_empresa'),
    path('empresas/nueva/', EmpresaNuevaView.as_view(), name='tenants_empresa_nueva'),
    path('cuenta/usuarios/', UsuariosCuentaView.as_view(), name='tenants_cuenta_usuarios'),
    path('cuenta/usuarios/<int:pk>/', UsuarioCuentaDetailView.as_view(), name='tenants_cuenta_usuario'),
    path('planes/', PlanesView.as_view(), name='tenants_planes'),
    path('pagos/', PagosView.as_view(), name='tenants_pagos'),
    path('pagos/transferencia/', PagoTransferenciaView.as_view(), name='tenants_pago_transferencia'),
    path('pagos/stripe/', PagoStripeView.as_view(), name='tenants_pago_stripe'),
    path('pagos/stripe/webhook/', StripeWebhookView.as_view(), name='tenants_stripe_webhook'),
    # Administración de la plataforma
    path('admin/empresas/', EmpresasAdminView.as_view(), name='tenants_admin_empresas'),
    path('admin/empresas/<int:pk>/', EmpresaAdminDetailView.as_view(), name='tenants_admin_empresa'),
    path('admin/empresas/<int:pk>/extender/', ExtenderPruebaView.as_view(), name='tenants_admin_extender'),
    path('admin/pruebas/', EmpresaPruebaView.as_view(), name='tenants_admin_pruebas'),
    path('admin/pagos/', PagosAdminView.as_view(), name='tenants_admin_pagos'),
    path('admin/pagos/<int:pk>/confirmar/', ConfirmarPagoAdminView.as_view(), name='tenants_admin_confirmar'),
]
