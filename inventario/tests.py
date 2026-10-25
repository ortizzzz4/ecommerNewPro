from decimal import Decimal

from django.contrib.auth.models import Permission
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from contacts.models import Contact
from empresa.models import Empresa
from invoices.models import Invoice
from pos.models import CajaSesion, VentaPos
from pos.seguridad import generar_token
from pos.services import PosError, crear_venta
from products.models import Product
from users.models import User

from .models import Compra, ComponenteProducto, MovimientoInventario, Recepcion
from .services import CompraError, RecepcionError, StockError, confirmar_recepcion, crear_compra, descontar, registrar_movimiento


def permiso(codigo):
    app, codename = codigo.split('.')
    return Permission.objects.get(content_type__app_label=app, codename=codename)


def producto(titulo, tipo='bien', precio='10.00', stock='0', **extra):
    return Product.objects.create(title=titulo, description='d', price=Decimal(precio), image='products/x.png',
                                  tipo=tipo, stock=Decimal(stock), **extra)


class ExistenciasTests(TestCase):
    def setUp(self):
        cache.clear()
        self.cajero = User.objects.create_user(username='cajero', password='x')
        self.cajero.user_permissions.add(permiso('pos.use_pos'))
        self.cajero = User.objects.get(pk=self.cajero.pk)
        self.papel = producto('Papel bond', stock='10')
        self.cafe = producto('Café', stock='5')
        self.kit = producto('Kit oficina', tipo='kit', precio='20.00')
        ComponenteProducto.objects.create(padre=self.kit, componente=self.papel, cantidad=Decimal('2'))
        ComponenteProducto.objects.create(padre=self.kit, componente=self.cafe, cantidad=Decimal('1'))

    def test_venta_pos_descuenta_stock_y_registra_movimiento(self):
        crear_venta(self.cajero, [{'product_id': self.cafe.id, 'quantity': 2}], 'tarjeta')
        self.cafe.refresh_from_db()
        self.assertEqual(self.cafe.stock, Decimal('3'))
        mov = MovimientoInventario.objects.get(producto=self.cafe)
        self.assertEqual(mov.tipo, 'venta')
        self.assertEqual(mov.cantidad, Decimal('-2'))

    def test_kit_descuenta_sus_componentes(self):
        # Un kit se vende por la web o facturación, no por POS: se descuenta directamente
        descontar([(self.kit, 2)], motivo='prueba')
        self.papel.refresh_from_db()
        self.cafe.refresh_from_db()
        self.assertEqual(self.papel.stock, Decimal('6'))  # 10 - 2*2
        self.assertEqual(self.cafe.stock, Decimal('3'))   # 5 - 2*1

    def test_stock_insuficiente_no_vende_nada(self):
        with self.assertRaises(PosError):
            crear_venta(self.cajero, [{'product_id': self.cafe.id, 'quantity': 1},
                                      {'product_id': self.papel.id, 'quantity': 50}], 'tarjeta')
        self.cafe.refresh_from_db()
        self.papel.refresh_from_db()
        self.assertEqual((self.cafe.stock, self.papel.stock), (Decimal('5'), Decimal('10')))
        self.assertEqual(VentaPos.objects.count(), 0)

    def test_servicio_no_se_vende_en_pos(self):
        servicio = producto('Instalación', tipo='servicio')
        with self.assertRaises(PosError):
            crear_venta(self.cajero, [{'product_id': servicio.id, 'quantity': 1}], 'tarjeta')

    def test_kit_no_se_vende_en_pos(self):
        with self.assertRaises(PosError):
            crear_venta(self.cajero, [{'product_id': self.kit.id, 'quantity': 1}], 'tarjeta')

    def test_producto_oculto_en_pos_no_se_vende(self):
        oculto = producto('Solo ventas', stock='3', visible_pos=False)
        with self.assertRaises(PosError):
            crear_venta(self.cajero, [{'product_id': oculto.id, 'quantity': 1}], 'tarjeta')

    def test_combo_sin_componentes_no_descuenta(self):
        combo = producto('Combo vacío', tipo='combo')
        with self.assertRaises(StockError):
            descontar([(combo, 1)], motivo='prueba')

    def test_entrada_suma_y_ajuste_no_deja_negativo(self):
        registrar_movimiento(self.cafe, 'entrada', 10, 'Compra')
        self.cafe.refresh_from_db()
        self.assertEqual(self.cafe.stock, Decimal('15'))
        with self.assertRaises(StockError):
            registrar_movimiento(self.cafe, 'ajuste', -100, 'Merma')

    def test_api_movimiento_y_componentes(self):
        admin = User.objects.create_superuser(username='admin', password='x', email='a@x.com')
        api = APIClient()
        api.force_authenticate(admin)
        r = api.post('/api/inventario/movimientos/', {'producto_id': self.papel.id, 'cantidad': 5,
                                                       'tipo': 'entrada', 'motivo': 'Compra'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.papel.refresh_from_db()
        self.assertEqual(self.papel.stock, Decimal('15'))

        r = api.put(f'/api/inventario/productos/{self.papel.id}/componentes/', [], format='json')
        self.assertEqual(r.status_code, 400)  # un bien no tiene componentes
        r = api.get(f'/api/inventario/productos/{self.kit.id}/componentes/')
        self.assertEqual(len(r.json()), 2)


class PinPosTests(TestCase):
    def setUp(self):
        cache.clear()
        self.cajero = User.objects.create_user(username='cajero', password='x')
        self.cajero.user_permissions.add(permiso('pos.use_pos'))
        self.cajero.set_pin('1234')
        self.cajero.save()
        self.cajero = User.objects.get(pk=self.cajero.pk)
        self.cafe = producto('Café', stock='5')
        CajaSesion.objects.create(cajero=self.cajero)
        self.api = APIClient()
        self.api.force_authenticate(self.cajero)

    def _venta(self, headers=None):
        return self.api.post('/api/pos/ventas/', {'lineas': [{'product_id': self.cafe.id, 'quantity': 1}],
                                                  'metodo_pago': 'tarjeta', 'imprimir': False},
                             format='json', **(headers or {}))

    def test_venta_sin_token_queda_bloqueada(self):
        self.assertEqual(self._venta().status_code, 403)

    def test_pin_incorrecto_no_desbloquea(self):
        r = self.api.post('/api/pos/desbloqueo/', {'pin': '0000'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_bloqueo_tras_cinco_intentos(self):
        for _ in range(5):
            self.api.post('/api/pos/desbloqueo/', {'pin': '0000'}, format='json')
        r = self.api.post('/api/pos/desbloqueo/', {'pin': '1234'}, format='json')
        self.assertEqual(r.status_code, 429)

    def test_pin_correcto_da_token_que_permite_vender(self):
        r = self.api.post('/api/pos/desbloqueo/', {'pin': '1234'}, format='json')
        self.assertEqual(r.status_code, 200)
        token = r.json()['token']
        self.assertEqual(self._venta({'HTTP_X_POS_DESBLOQUEO': token}).status_code, 201)

    def test_token_de_otro_usuario_no_sirve(self):
        otro = User.objects.create_user(username='otro', password='x')
        otro.user_permissions.add(permiso('pos.use_pos'))
        token = generar_token(otro)
        self.assertEqual(self._venta({'HTTP_X_POS_DESBLOQUEO': token}).status_code, 403)

    def test_usuario_sin_pin_no_puede_desbloquear(self):
        sin = User.objects.create_user(username='sin_pin', password='x')
        sin.user_permissions.add(permiso('pos.use_pos'))
        api = APIClient()
        api.force_authenticate(User.objects.get(pk=sin.pk))
        self.assertEqual(api.post('/api/pos/desbloqueo/', {'pin': '1234'}, format='json').status_code, 400)

    def test_cambiar_pin_propio(self):
        r = self.api.post('/api/usuarios/yo/pin/', {'pin_actual': '9999', 'pin_nuevo': '5678'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.api.post('/api/usuarios/yo/pin/', {'pin_actual': '1234', 'pin_nuevo': '5678'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.cajero.refresh_from_db()
        self.assertTrue(self.cajero.check_pin('5678'))


class EmpresaFacturacionElectronicaTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = User.objects.create_superuser(username='admin', password='x', email='a@x.com')
        self.api = APIClient()
        self.api.force_authenticate(self.admin)

    def test_no_se_activa_sin_datos_fiscales(self):
        r = self.api.patch('/api/empresa/', {'facturacion_electronica': True}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('facturacion_electronica', r.json())

    def test_con_datos_completos_las_facturas_reciben_numero_de_control(self):
        r = self.api.patch('/api/empresa/', {
            'razon_social': 'Ortiz SA de CV', 'nit': '0614-000000-000-0', 'nrc': '1234-5',
            'giro': 'Comercio', 'codigo_establecimiento': 'M001', 'codigo_punto_venta': 'P001',
            'facturacion_electronica': True, 'ambiente': '00',
        }, format='json')
        self.assertEqual(r.status_code, 200, r.content)

        factura = Invoice.objects.create(nombre_cliente='Consumidor final', tipo_documento='factura')
        self.assertTrue(factura.numero_control.startswith('DTE-01-M001P001-'))
        self.assertEqual(len(factura.numero_control), len('DTE-01-M001P001-') + 15)
        self.assertEqual(factura.estado_fe, 'generado')
        self.assertTrue(factura.codigo_generacion)

        ccf = Invoice.objects.create(nombre_cliente='Empresa', tipo_documento='credito_fiscal')
        self.assertTrue(ccf.numero_control.startswith('DTE-03-'))

        r = self.api.get(f'/api/fe/facturas/{factura.id}/dte/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['identificacion']['tipoDte'], '01')

    def test_transmision_no_configurada_avisa_sin_enviar_nada(self):
        Empresa.objects.update_or_create(pk=1, defaults={'facturacion_electronica': True,
                                                         'codigo_establecimiento': 'M001',
                                                         'codigo_punto_venta': 'P001'})
        factura = Invoice.objects.create(nombre_cliente='X')
        r = self.api.post(f'/api/fe/facturas/{factura.id}/transmitir/')
        self.assertEqual(r.status_code, 409)
        self.assertIn('no está configurada', r.json()['detail'])

    def test_factura_sin_fe_no_tiene_dte(self):
        factura = Invoice.objects.create(nombre_cliente='X')
        self.assertEqual(factura.estado_fe, 'no_aplica')
        self.assertEqual(self.api.get(f'/api/fe/facturas/{factura.id}/dte/').status_code, 400)


class CanalesProductoTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        producto('Para POS')
        producto('Solo compras', visible_pos=False, visible_ventas=False, visible_tienda=False)

    def test_filtro_por_canal(self):
        self.assertEqual(len(self.api.get('/productos/v1/product/').json()), 2)
        self.assertEqual([p['title'] for p in self.api.get('/productos/v1/product/?canal=tienda').json()], ['Para POS'])


class CompraRecepcionTests(TestCase):
    def setUp(self):
        cache.clear()
        self.proveedor = Contact.objects.create(nombre='Distribuidora', tipo='proveedor')
        self.papel = producto('Papel bond', stock='10')
        self.cafe = producto('Café', stock='5')
        self.servicio = producto('Instalación', tipo='servicio')
        self.admin = User.objects.create_superuser(username='admin', password='x', email='a@x.com')
        self.api = APIClient()
        self.api.force_authenticate(self.admin)

    def test_compra_crea_recepcion_pendiente_sin_mover_stock(self):
        compra = crear_compra(self.proveedor, [(self.papel, Decimal('20'), Decimal('1.50'))], usuario=self.admin)
        recepcion = Recepcion.objects.get(compra=compra)
        self.assertEqual(recepcion.estado, 'pendiente')
        self.assertEqual(recepcion.lineas.get().cantidad_esperada, Decimal('20'))
        self.assertIsNone(recepcion.lineas.get().cantidad_recibida)
        self.papel.refresh_from_db()
        self.assertEqual(self.papel.stock, Decimal('10'))
        self.assertFalse(MovimientoInventario.objects.exists())

    def test_confirmar_recepcion_ingresa_existencias(self):
        compra = crear_compra(self.proveedor, [(self.papel, Decimal('20'), Decimal('1.50'))], usuario=self.admin)
        recepcion = confirmar_recepcion(compra.recepcion, usuario=self.admin)
        self.assertEqual(recepcion.estado, 'recibida')
        self.assertIsNotNone(recepcion.recibida_en)
        self.papel.refresh_from_db()
        self.assertEqual(self.papel.stock, Decimal('30'))
        mov = MovimientoInventario.objects.get(producto=self.papel)
        self.assertEqual((mov.tipo, mov.cantidad, mov.referencia), ('entrada', Decimal('20'), f'Compra #{compra.pk}'))

    def test_recepcion_parcial_ingresa_solo_lo_recibido(self):
        compra = crear_compra(self.proveedor, [(self.papel, Decimal('20'), Decimal('1.50'))], usuario=self.admin)
        linea = compra.recepcion.lineas.get()
        confirmar_recepcion(compra.recepcion, {linea.pk: Decimal('12')}, usuario=self.admin)
        linea.refresh_from_db()
        self.assertEqual(linea.cantidad_recibida, Decimal('12'))
        self.papel.refresh_from_db()
        self.assertEqual(self.papel.stock, Decimal('22'))

    def test_recepcion_no_se_confirma_dos_veces(self):
        compra = crear_compra(self.proveedor, [(self.cafe, Decimal('5'), Decimal('2'))])
        confirmar_recepcion(compra.recepcion)
        with self.assertRaises(RecepcionError):
            confirmar_recepcion(Recepcion.objects.get(pk=compra.recepcion.pk))
        self.cafe.refresh_from_db()
        self.assertEqual(self.cafe.stock, Decimal('10'))

    def test_servicio_no_se_puede_comprar_para_inventario(self):
        with self.assertRaises(CompraError):
            crear_compra(self.proveedor, [(self.servicio, Decimal('1'), Decimal('5'))])
        self.assertFalse(Compra.objects.exists())

    def test_api_crea_compra_y_confirma_recepcion(self):
        r = self.api.post('/api/inventario/compras/', {
            'proveedor_id': self.proveedor.id, 'notas': 'Pedido mensual',
            'lineas': [{'producto_id': self.papel.id, 'cantidad': 8, 'costo_unitario': 2}],
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['total'], '16.00')
        recepcion_id = r.json()['recepcion_id']

        linea_id = Recepcion.objects.get(pk=recepcion_id).lineas.get().pk
        r = self.api.post(f'/api/inventario/recepciones/{recepcion_id}/confirmar/',
                          {'lineas': [{'id': linea_id, 'cantidad_recibida': 7}]}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['estado'], 'recibida')
        self.papel.refresh_from_db()
        self.assertEqual(self.papel.stock, Decimal('17'))

        r = self.api.post(f'/api/inventario/recepciones/{recepcion_id}/confirmar/', {}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_api_rechaza_proveedor_no_valido_y_servicios(self):
        cliente = Contact.objects.create(nombre='Cliente', tipo='cliente')
        r = self.api.post('/api/inventario/compras/', {
            'proveedor_id': cliente.id, 'lineas': [{'producto_id': self.papel.id, 'cantidad': 1}],
        }, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.api.post('/api/inventario/compras/', {
            'proveedor_id': self.proveedor.id, 'lineas': [{'producto_id': self.servicio.id, 'cantidad': 1}],
        }, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(Compra.objects.exists())

    def test_confirmar_requiere_permiso_de_recepciones(self):
        compra = crear_compra(self.proveedor, [(self.cafe, Decimal('5'), Decimal('2'))])
        comprador = User.objects.create_user(username='comprador', password='x')
        comprador.user_permissions.add(permiso('inventario.add_compra'), permiso('inventario.view_recepcion'))
        api = APIClient()
        api.force_authenticate(User.objects.get(pk=comprador.pk))
        r = api.post(f'/api/inventario/recepciones/{compra.recepcion.pk}/confirmar/', {}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(Recepcion.objects.get(pk=compra.recepcion.pk).estado, 'pendiente')
