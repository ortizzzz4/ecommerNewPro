from django.urls import path

from .views import (
    AsientoAnularView, AsientosView, BalanceGeneralView, BalanzaView, CargarPlanBaseView, ContabilizarFacturasView,
    CuentasView, EstadoResultadosView, LibroDiarioView, LibroMayorView,
)

urlpatterns = [
    path('cuentas/', CuentasView.as_view(), name='contabilidad_cuentas'),
    path('cuentas/cargar-base/', CargarPlanBaseView.as_view(), name='contabilidad_cargar_base'),
    path('asientos/', AsientosView.as_view(), name='contabilidad_asientos'),
    path('asientos/<int:pk>/anular/', AsientoAnularView.as_view(), name='contabilidad_anular'),
    path('contabilizar-facturas/', ContabilizarFacturasView.as_view(), name='contabilidad_contabilizar'),
    path('libro-diario/', LibroDiarioView.as_view(), name='contabilidad_libro_diario'),
    path('libro-mayor/', LibroMayorView.as_view(), name='contabilidad_libro_mayor'),
    path('balanza/', BalanzaView.as_view(), name='contabilidad_balanza'),
    path('balance-general/', BalanceGeneralView.as_view(), name='contabilidad_balance'),
    path('estado-resultados/', EstadoResultadosView.as_view(), name='contabilidad_resultados'),
]
