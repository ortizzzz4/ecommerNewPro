from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from invoices.models import Invoice, InvoiceItem

from .models import Asiento, Cuenta
from .services import (
    ContabilidadError, balance_general, balanza_comprobacion, cargar_plan_base, contabilizar_facturas,
    crear_asiento, cuenta_por_codigo, estado_resultados, libro_diario, libro_mayor,
)


def _factura(status='pendiente', precio='10.00', cantidad=2):
    # Con cantidad 2 a $10 la base es $20 y el IVA 13% es $2.60; total $22.60
    factura = Invoice.objects.create(nombre_cliente='Cliente de prueba', status=status)
    InvoiceItem.objects.create(factura=factura, descripcion='Producto', cantidad=cantidad, precio_unit=Decimal(precio))
    return factura


class PlanDeCuentasTests(TestCase):
    def test_plan_base_se_puede_cargar_varias_veces_sin_duplicar(self):
        primera = cargar_plan_base()
        self.assertGreater(primera, 0)
        self.assertEqual(cargar_plan_base(), 0)
        self.assertEqual(Cuenta.objects.filter(codigo='1.1.01').count(), 1)
        self.assertEqual(cuenta_por_codigo('1.1.01').padre.codigo, '1.1')

    def test_naturaleza_segun_el_tipo(self):
        cargar_plan_base()
        self.assertEqual(cuenta_por_codigo('1.1.01').naturaleza, 'deudora')
        self.assertEqual(cuenta_por_codigo('4.1').naturaleza, 'acreedora')


class AsientoTests(TestCase):
    def setUp(self):
        cargar_plan_base()
        self.caja = cuenta_por_codigo('1.1.01')
        self.capital = cuenta_por_codigo('3.1')

    def test_asiento_que_cuadra_se_guarda_con_numero_correlativo(self):
        primero = crear_asiento(date(2026, 1, 5), 'Aporte inicial', [
            {'cuenta': self.caja, 'debe': '500.00'},
            {'cuenta': self.capital, 'haber': '500.00'},
        ])
        segundo = crear_asiento(date(2026, 1, 6), 'Otro', [
            {'cuenta': self.caja, 'debe': '1'},
            {'cuenta': self.capital, 'haber': '1'},
        ])
        self.assertEqual(segundo.numero, primero.numero + 1)
        self.assertEqual(primero.partidas.count(), 2)

    def test_asiento_descuadrado_no_se_guarda(self):
        with self.assertRaises(ContabilidadError):
            crear_asiento(date(2026, 1, 5), 'Descuadrado', [
                {'cuenta': self.caja, 'debe': '500.00'},
                {'cuenta': self.capital, 'haber': '499.99'},
            ])
        self.assertEqual(Asiento.objects.count(), 0)

    def test_partida_con_debe_y_haber_a_la_vez_se_rechaza(self):
        with self.assertRaises(ContabilidadError):
            crear_asiento(date(2026, 1, 5), 'Mezclado', [
                {'cuenta': self.caja, 'debe': '10', 'haber': '10'},
                {'cuenta': self.capital, 'haber': '0'},
            ])

    def test_cuenta_agrupadora_no_recibe_movimientos(self):
        agrupadora = cuenta_por_codigo('1')
        with self.assertRaises(ContabilidadError):
            crear_asiento(date(2026, 1, 5), 'En agrupadora', [
                {'cuenta': agrupadora, 'debe': '10'},
                {'cuenta': self.capital, 'haber': '10'},
            ])


class ContabilizarFacturasTests(TestCase):
    def setUp(self):
        cargar_plan_base()

    def test_venta_y_cobro_de_una_factura_y_reportes_que_cuadran(self):
        factura = _factura(status='pendiente')

        self.assertEqual(contabilizar_facturas(), {'ventas': 1, 'cobros': 0, 'anuladas': 0})
        # Volver a ejecutar no duplica nada
        self.assertEqual(contabilizar_facturas(), {'ventas': 0, 'cobros': 0, 'anuladas': 0})

        # Al cobrarla, se registra el cobro en caja
        factura.status = 'pagada'
        factura.save(update_fields=['status'])
        self.assertEqual(contabilizar_facturas(), {'ventas': 0, 'cobros': 1, 'anuladas': 0})

        mayor_caja = libro_mayor(cuenta_por_codigo('1.1.01'))
        self.assertEqual(mayor_caja['cuenta']['saldo'], Decimal('22.60'))
        mayor_cxc = libro_mayor(cuenta_por_codigo('1.1.02'))
        self.assertEqual(mayor_cxc['cuenta']['saldo'], Decimal('0.00'))

        resultados = estado_resultados()
        self.assertEqual(resultados['ingresos']['total'], Decimal('20.00'))
        self.assertEqual(resultados['utilidad_neta'], Decimal('20.00'))

        general = balance_general()
        self.assertTrue(general['cuadra'])
        self.assertEqual(general['activo']['total'], Decimal('22.60'))
        self.assertEqual(general['pasivo']['total'], Decimal('2.60'))
        self.assertEqual(general['patrimonio']['total'], Decimal('20.00'))

        balanza = balanza_comprobacion()
        self.assertEqual(balanza['totales']['debe'], balanza['totales']['haber'])

    def test_factura_anulada_anula_sus_asientos(self):
        factura = _factura(status='pendiente')
        contabilizar_facturas()
        factura.status = 'anulada'
        factura.save(update_fields=['status'])

        self.assertEqual(contabilizar_facturas()['anuladas'], 1)
        self.assertEqual(Asiento.objects.filter(referencia=factura.numero, estado='anulado').count(), 1)
        self.assertEqual(libro_diario(), [])
        self.assertEqual(estado_resultados()['utilidad_neta'], Decimal('0.00'))

    def test_gastos_reducen_la_utilidad_neta(self):
        contabilizar_facturas()
        _factura(status='pendiente')
        contabilizar_facturas()
        crear_asiento(date.today(), 'Pago de luz', [
            {'cuenta': cuenta_por_codigo('6.1'), 'debe': '5.00'},
            {'cuenta': cuenta_por_codigo('1.1.01'), 'haber': '5.00'},
        ])

        resultados = estado_resultados()
        self.assertEqual(resultados['gastos']['total'], Decimal('5.00'))
        self.assertEqual(resultados['utilidad_neta'], Decimal('15.00'))
        self.assertTrue(balance_general()['cuadra'])


class ContabilidadApiTests(TestCase):
    def setUp(self):
        cargar_plan_base()
        self.api = APIClient()

    def test_sin_sesion_no_hay_acceso(self):
        self.assertEqual(self.api.get('/api/contabilidad/cuentas/').status_code, 401)

    def test_administrador_registra_asiento_y_consulta_libro_mayor(self):
        admin = get_user_model().objects.create_superuser('contador', 'c@example.com', 'clave-segura-1')
        self.api.force_authenticate(admin)

        r = self.api.post('/api/contabilidad/asientos/', {
            'fecha': '2026-02-01', 'descripcion': 'Aporte de socios',
            'partidas': [
                {'cuenta': cuenta_por_codigo('1.1.01').id, 'debe': '100.00'},
                {'cuenta': cuenta_por_codigo('3.1').id, 'haber': '100.00'},
            ],
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)

        r = self.api.get('/api/contabilidad/libro-mayor/', {'cuenta': cuenta_por_codigo('1.1.01').id})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['cuenta']['saldo'], '100.00')

        r = self.api.get('/api/contabilidad/balance-general/', {'hasta': '2026-12-31'})
        self.assertTrue(r.json()['cuadra'])

    def test_fecha_invalida_responde_400(self):
        admin = get_user_model().objects.create_superuser('contador2', 'c2@example.com', 'clave-segura-1')
        self.api.force_authenticate(admin)
        self.assertEqual(self.api.get('/api/contabilidad/balanza/', {'desde': 'ayer'}).status_code, 400)
        self.assertEqual(self.api.get('/api/contabilidad/libro-mayor/', {'cuenta': 'abc'}).status_code, 400)
