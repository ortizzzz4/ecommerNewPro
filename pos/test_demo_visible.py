from django.contrib.auth.models import Permission
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from empresa.demo import activar_datos_demo
from pos.seguridad import generar_token
from users.models import User


class ProductosDemoEnPosTests(TestCase):
    def setUp(self):
        cache.clear()
        activar_datos_demo()
        cajero = User.objects.create_user(username='cajero', password='x')
        cajero.user_permissions.add(Permission.objects.get(codename='use_pos'))
        self.cajero = User.objects.get(pk=cajero.pk)
        self.api = APIClient()
        self.api.force_authenticate(self.cajero)

    def test_productos_de_demo_visibles_en_pos(self):
        r = self.api.get('/api/pos/productos/', HTTP_X_POS_DESBLOQUEO=generar_token(self.cajero))
        self.assertEqual(r.status_code, 200)
        titulos = [p['title'] for p in r.json()]
        self.assertEqual(titulos, ['Café americano', 'Combo desayuno', 'Pan dulce'])

    def test_productos_ocultos_no_aparecen_en_pos(self):
        r = self.api.get('/api/pos/productos/', HTTP_X_POS_DESBLOQUEO=generar_token(self.cajero))
        titulos = [p['title'] for p in r.json()]
        self.assertNotIn('Papel bond carta', titulos)
        self.assertNotIn('Instalación de equipo', titulos)


class CorsCabecerasTests(TestCase):
    def test_preflight_permite_la_cabecera_del_pos(self):
        r = APIClient().options(
            '/api/pos/productos/',
            HTTP_ORIGIN='http://localhost:5173',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='GET',
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS='x-pos-desbloqueo,authorization',
        )
        permitidas = r.get('Access-Control-Allow-Headers', '')
        self.assertIn('x-pos-desbloqueo', permitidas)
        self.assertIn('authorization', permitidas)


class CodigoBarrasYImagenesTests(TestCase):
    def setUp(self):
        cache.clear()
        activar_datos_demo()
        cajero = User.objects.create_user(username='cajero3', password='x')
        cajero.user_permissions.add(Permission.objects.get(codename='use_pos'))
        self.cajero = User.objects.get(pk=cajero.pk)
        self.api = APIClient()
        self.api.force_authenticate(self.cajero)

    def test_pos_incluye_codigo_de_barras(self):
        r = self.api.get('/api/pos/productos/', HTTP_X_POS_DESBLOQUEO=generar_token(self.cajero))
        cafe = next(p for p in r.json() if p['title'] == 'Café americano')
        self.assertEqual(cafe['codigo_barras'], '7700000000011')

    def test_productos_demo_tienen_imagen(self):
        from products.models import Product
        for producto in Product.objects.filter(es_demo=True):
            self.assertTrue(producto.image, producto.title)

    def test_codigo_de_barras_no_se_repite(self):
        from django.db import IntegrityError
        from products.models import Product
        with self.assertRaises(IntegrityError):
            Product.objects.create(title='Otro', description='d', price=1, image='products/o.png',
                                   codigo_barras='7700000000011')


class CajaYVentasTests(TestCase):
    def setUp(self):
        from pos.models import CajaSesion  # noqa
        cache.clear()
        activar_datos_demo()
        cajero = User.objects.create_user(username='caja1', password='x')
        cajero.user_permissions.add(Permission.objects.get(codename='use_pos'))
        self.cajero = User.objects.get(pk=cajero.pk)
        self.api = APIClient()
        self.api.force_authenticate(self.cajero)
        self.token = generar_token(self.cajero)
        from products.models import Product
        self.cafe = Product.objects.get(title="Café americano")

    def _h(self):
        return {'HTTP_X_POS_DESBLOQUEO': self.token}

    def test_no_se_vende_sin_caja_abierta(self):
        r = self.api.post('/api/pos/ventas/', {'lineas': [{'product_id': self.cafe.id, 'quantity': 1}],
                                              'metodo_pago': 'efectivo', 'monto_recibido': '5', 'imprimir': False},
                          format='json', **self._h())
        self.assertEqual(r.status_code, 400)
        self.assertIn('Abre la caja', r.json()['detail'])

    def test_abrir_vender_y_cerrar_con_conciliacion(self):
        r = self.api.post('/api/pos/caja/abrir/', {'monto_inicial': '20.00'}, format='json', **self._h())
        self.assertEqual(r.status_code, 201, r.content)
        # Segunda caja del mismo cajero: no se permite
        self.assertEqual(self.api.post('/api/pos/caja/abrir/', {'monto_inicial': '5'}, format='json', **self._h()).status_code, 400)

        # Venta en efectivo de 1.50 + 13% = 1.70 (cobra 2.00, cambio 0.30)
        r = self.api.post('/api/pos/ventas/', {'lineas': [{'product_id': self.cafe.id, 'quantity': 1}],
                                              'metodo_pago': 'efectivo', 'monto_recibido': '2', 'imprimir': False},
                          format='json', **self._h())
        self.assertEqual(r.status_code, 201, r.content)

        # Esperado: 20 + 1.70 = 21.70. Se cuentan 21.00 -> diferencia -0.70
        r = self.api.post('/api/pos/caja/cerrar/', {'monto_contado': '21.00', 'imprimir': False}, format='json', **self._h())
        self.assertEqual(r.status_code, 200, r.content)
        caja = r.json()['caja']
        self.assertEqual(caja['esperado_efectivo'], '21.70')
        self.assertEqual(caja['total_efectivo'], '1.70')
        self.assertEqual(caja['diferencia'], '-0.70')
        self.assertIsNotNone(caja['cerrada'])

        self.assertIsNone(self.api.get('/api/pos/caja/actual/', **self._h()).json()['caja'])

    def test_cada_venta_queda_en_facturacion(self):
        from invoices.models import Invoice
        self.api.post('/api/pos/caja/abrir/', {'monto_inicial': '0'}, format='json', **self._h())
        self.api.post('/api/pos/ventas/', {'lineas': [{'product_id': self.cafe.id, 'quantity': 1}],
                                          'metodo_pago': 'tarjeta', 'imprimir': False}, format='json', **self._h())
        self.assertEqual(Invoice.objects.filter(tipo_documento='ticket').count(), 1)


class DesgloseEfectivoTests(TestCase):
    def setUp(self):
        cache.clear()
        cajero = User.objects.create_user(username='billetes', password='x')
        cajero.user_permissions.add(Permission.objects.get(codename='use_pos'))
        self.cajero = User.objects.get(pk=cajero.pk)
        self.token = generar_token(self.cajero)
        self.api = APIClient()
        self.api.force_authenticate(self.cajero)

    def _h(self):
        return {'HTTP_X_POS_DESBLOQUEO': self.token}

    def test_apertura_calcula_monto_desde_billetes_y_monedas(self):
        # 2 x $20 + 1 x $5 + 3 x $0.25 + 4 x $0.10 = 40 + 5 + 0.75 + 0.40 = 46.15
        r = self.api.post('/api/pos/caja/abrir/', {'desglose': {'20': 2, '5': 1, '0.25': 3, '0.10': 4}},
                          format='json', **self._h())
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['monto_inicial'], '46.15')
        self.assertEqual(r.json()['desglose_inicial'], {'20': 2, '5': 1, '0.25': 3, '0.10': 4})

    def test_denominacion_invalida_se_rechaza(self):
        r = self.api.post('/api/pos/caja/abrir/', {'desglose': {'7': 1}}, format='json', **self._h())
        self.assertEqual(r.status_code, 400)

    def test_cantidad_negativa_se_rechaza(self):
        r = self.api.post('/api/pos/caja/abrir/', {'desglose': {'1': -2}}, format='json', **self._h())
        self.assertEqual(r.status_code, 400)

    def test_cierre_con_desglose_concilia(self):
        self.api.post('/api/pos/caja/abrir/', {'desglose': {'20': 1}}, format='json', **self._h())
        # Se cuentan 2 x $10 = $20 (sin ventas, esperado = $20)
        r = self.api.post('/api/pos/caja/cerrar/', {'desglose': {'10': 2}, 'imprimir': False},
                          format='json', **self._h())
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['caja']['monto_contado'], '20.00')
        self.assertEqual(r.json()['caja']['diferencia'], '0.00')
