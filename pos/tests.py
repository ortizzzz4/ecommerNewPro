import socket
import threading
from decimal import Decimal

from django.contrib.auth.models import Group, Permission
from django.test import TestCase
from rest_framework.test import APIClient

from products.models import Product
from users.models import User

from .escpos import CUT, INIT
from .models import CajaSesion, PrinterProfile, VentaPos
from .seguridad import generar_token
from .services import PosError, crear_venta, imprimir_venta
from .ticket import construir_ticket
from .transport import PrinterError, enviar


def permiso(codigo):
    app, codename = codigo.split('.')
    return Permission.objects.get(content_type__app_label=app, codename=codename)


class ServidorImpresoraFalsa:
    """Escucha en localhost y guarda lo que recibe, como si fuera una impresora de red."""

    def __init__(self):
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.bind(('127.0.0.1', 0))
        self.socket.listen(1)
        self.puerto = self.socket.getsockname()[1]
        self.recibido = b''
        self.hilo = threading.Thread(target=self._atender, daemon=True)
        self.hilo.start()

    def _atender(self):
        conexion, _ = self.socket.accept()
        with conexion:
            trozos = []
            while True:
                dato = conexion.recv(4096)
                if not dato:
                    break
                trozos.append(dato)
        self.recibido = b''.join(trozos)
        self.socket.close()


class VentaTests(TestCase):
    def setUp(self):
        self.cajero = User.objects.create_user(username='cajero', password='x')
        self.producto = Product.objects.create(title='Café', description='d', price=Decimal('10.50'), image='products/c.png', stock=Decimal('100'))
        self.otro = Product.objects.create(title='Pan', description='d', price=Decimal('2.00'), image='products/p.png', stock=Decimal('100'))

    def test_totales_con_descuento_e_iva(self):
        venta = crear_venta(
            self.cajero,
            [{'product_id': self.producto.id, 'quantity': 2}],
            metodo_pago='efectivo', monto_recibido='25', descuento_pct='10',
        )
        self.assertEqual(venta.subtotal, Decimal('21.00'))
        self.assertEqual(venta.descuento_monto, Decimal('2.10'))
        self.assertEqual(venta.impuesto_monto, Decimal('2.46'))  # 13% de 18.90
        self.assertEqual(venta.total, Decimal('21.36'))
        self.assertEqual(venta.cambio, Decimal('3.64'))

    def test_productos_repetidos_se_suman(self):
        venta = crear_venta(
            self.cajero,
            [{'product_id': self.producto.id, 'quantity': 1}, {'product_id': self.producto.id, 'quantity': 2}],
            metodo_pago='tarjeta',
        )
        self.assertEqual(venta.lineas.get().cantidad, 3)
        self.assertEqual(venta.subtotal, Decimal('31.50'))

    def test_efectivo_insuficiente_se_rechaza(self):
        with self.assertRaises(PosError):
            crear_venta(self.cajero, [{'product_id': self.producto.id, 'quantity': 1}],
                        metodo_pago='efectivo', monto_recibido='5')
        self.assertEqual(VentaPos.objects.count(), 0)

    def test_producto_inexistente(self):
        with self.assertRaises(PosError):
            crear_venta(self.cajero, [{'product_id': 9999, 'quantity': 1}], metodo_pago='tarjeta')


class TicketTests(TestCase):
    def setUp(self):
        self.cajero = User.objects.create_user(username='cajero', password='x')
        producto = Product.objects.create(title='Café', description='d', price=Decimal('10.50'), image='products/c.png', stock=Decimal('100'))
        self.venta = crear_venta(self.cajero, [{'product_id': producto.id, 'quantity': 1}],
                                 metodo_pago='efectivo', monto_recibido='20')

    def test_ticket_usa_comandos_escpos_y_codepage(self):
        datos = construir_ticket(self.venta, ancho_papel=80, codepage='cp858')
        self.assertTrue(datos.startswith(INIT))
        self.assertIn(b'\x1b\x74\x13', datos)  # ESC t 19 (CP858)
        self.assertTrue(datos.rstrip().endswith(CUT))
        self.assertIn(self.venta.folio.encode(), datos)

    def test_ticket_58mm_es_mas_angosto(self):
        datos = construir_ticket(self.venta, ancho_papel=58)
        self.assertIn(b'-' * 32, datos)
        self.assertNotIn(b'-' * 33, datos)

    def test_envio_por_red_a_impresora_falsa(self):
        servidor = ServidorImpresoraFalsa()
        impresora = PrinterProfile.objects.create(nombre='Térmica', conexion='red', host='127.0.0.1',
                                                  puerto=servidor.puerto, ancho_papel=80)
        imprimir_venta(self.venta, impresora)
        servidor.hilo.join(timeout=5)
        self.assertTrue(servidor.recibido.startswith(INIT))
        self.assertTrue(servidor.recibido.rstrip().endswith(CUT))

    def test_impresora_apagada_da_error_claro(self):
        impresora = PrinterProfile(nombre='Off', conexion='red', host='127.0.0.1', puerto=1)
        with self.assertRaises(PrinterError):
            enviar(impresora, b'x')


class PosApiTests(TestCase):
    def setUp(self):
        self.producto = Product.objects.create(title='Café', description='d', price=Decimal('10.00'), image='products/c.png', stock=Decimal('100'))
        self.sin_permiso = User.objects.create_user(username='visitante', password='x')
        self.cajero = User.objects.create_user(username='cajero', password='x')
        rol = Group.objects.create(name='Cajero')
        rol.permissions.set([permiso('pos.use_pos')])
        self.cajero.groups.add(rol)

        self.api = APIClient()
        CajaSesion.objects.create(cajero=self.cajero)

    def test_sin_permiso_pos_no_puede_vender(self):
        self.api.force_authenticate(self.sin_permiso)
        r = self.api.post('/api/pos/ventas/', {'lineas': [{'product_id': self.producto.id, 'quantity': 1}],
                                              'metodo_pago': 'tarjeta'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_cajero_vende_y_recibe_aviso_si_no_hay_impresora(self):
        self.api.force_authenticate(self.cajero)
        self.api.credentials(HTTP_X_POS_DESBLOQUEO=generar_token(self.cajero))
        r = self.api.post('/api/pos/ventas/', {'lineas': [{'product_id': self.producto.id, 'quantity': 2}],
                                              'metodo_pago': 'tarjeta', 'imprimir': True}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['venta']['total'], '22.60')
        self.assertFalse(r.json()['impresion']['ok'])  # no hay impresora predeterminada
        self.assertEqual(VentaPos.objects.count(), 1)

    def test_cajero_no_puede_cambiar_impresoras(self):
        self.api.force_authenticate(self.cajero)
        r = self.api.post('/api/pos/impresoras/', {'nombre': 'X', 'conexion': 'red', 'host': '10.0.0.5'}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(self.api.get('/api/pos/impresoras/').status_code, 200)


class PermisosModeloTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.producto = Product.objects.create(title='Café', description='d', price=Decimal('1.00'), image='products/c.png', stock=Decimal('100'))

    def test_productos_son_publicos_para_leer_pero_no_para_escribir(self):
        self.assertEqual(self.api.get('/productos/v1/product/').status_code, 200)
        r = self.api.delete(f'/productos/v1/product/{self.producto.id}/')
        self.assertIn(r.status_code, (401, 403))
        self.assertTrue(Product.objects.filter(pk=self.producto.id).exists())

    def test_facturas_exigen_permiso_de_lectura(self):
        usuario = User.objects.create_user(username='sin_roles', password='x')
        self.api.force_authenticate(usuario)
        self.assertEqual(self.api.get('/api/facturas/facturas/').status_code, 403)

        usuario.user_permissions.add(permiso('invoices.view_invoice'))
        usuario = User.objects.get(pk=usuario.pk)  # recarga caché de permisos
        self.api.force_authenticate(usuario)
        self.assertEqual(self.api.get('/api/facturas/facturas/').status_code, 200)


class GestionUsuariosTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(username='admin', password='x', email='a@x.com')
        self.vendedor = User.objects.create_user(username='vendedor', password='x')
        gestor = Group.objects.create(name='Gestor de usuarios')
        gestor.permissions.set([permiso('users.view_user'), permiso('users.add_user'), permiso('users.change_user')])
        self.vendedor.groups.add(gestor)

        self.api = APIClient()

    def test_usuario_sin_permisos_no_ve_usuarios(self):
        self.api.force_authenticate(User.objects.create_user(username='nadie', password='x'))
        self.assertEqual(self.api.get('/api/usuarios/usuarios/').status_code, 403)

    def test_crear_usuario_con_rol(self):
        rol = Group.objects.create(name='Cajero')
        self.api.force_authenticate(self.admin)
        r = self.api.post('/api/usuarios/usuarios/', {
            'username': 'nuevo', 'password': 'clave-segura', 'email': 'n@x.com', 'groups': [rol.id],
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(list(User.objects.get(username='nuevo').groups.all()), [rol])

    def test_no_puede_asignarse_un_rol_con_mas_permisos_que_tiene(self):
        admin_rol = Group.objects.create(name='Administrador')
        admin_rol.permissions.set([permiso('invoices.delete_invoice')])
        self.api.force_authenticate(self.vendedor)
        r = self.api.patch(f'/api/usuarios/usuarios/{self.vendedor.id}/', {'groups': [admin_rol.id]}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(self.vendedor.groups.filter(pk=admin_rol.pk).exists())

    def test_no_puede_modificar_superusuario(self):
        self.api.force_authenticate(self.vendedor)
        r = self.api.patch(f'/api/usuarios/usuarios/{self.admin.id}/', {'is_active': False}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_no_puede_eliminarse_a_si_mismo(self):
        self.api.force_authenticate(self.admin)
        r = self.api.delete(f'/api/usuarios/usuarios/{self.admin.id}/')
        self.assertEqual(r.status_code, 403)

    def test_yo_devuelve_permisos_efectivos(self):
        self.api.force_authenticate(self.vendedor)
        datos = self.api.get('/api/usuarios/yo/').json()
        self.assertIn('users.view_user', datos['permisos'])
        self.assertEqual(datos['roles'], ['Gestor de usuarios'])


class RolesBaseTests(TestCase):
    def test_comando_crea_roles_con_permisos_correctos(self):
        from django.core.management import call_command

        call_command('crear_roles', stdout=open(__import__('os').devnull, 'w'))
        cajero = Group.objects.get(name='Cajero')
        self.assertTrue(cajero.permissions.filter(codename='use_pos').exists())
        self.assertFalse(cajero.permissions.filter(codename='delete_product').exists())
        self.assertTrue(Group.objects.get(name='Administrador').permissions.filter(codename='delete_invoice').exists())


class FacturacionDesdePosTests(TestCase):
    def setUp(self):
        from contacts.models import Contact

        self.cajero = User.objects.create_user(username='cajero', password='x')
        self.cajero.user_permissions.add(permiso('pos.use_pos'))
        self.cajero.user_permissions.add(permiso('invoices.add_invoice'))
        self.cajero = User.objects.get(pk=self.cajero.pk)
        CajaSesion.objects.create(cajero=self.cajero)

        self.producto = Product.objects.create(title='Café', description='d', price=Decimal('10.00'), image='products/c.png', stock=Decimal('100'))
        self.cliente_fiscal = Contact.objects.create(nombre='Empresa SA', nit='0614-000000-000-1', nrc='123456', tipo='cliente')
        self.cliente_sin_nrc = Contact.objects.create(nombre='Juan', nit='0614-111111-111-1', tipo='cliente')
        self.lineas = [{'product_id': self.producto.id, 'quantity': 2}]

    def test_factura_se_crea_en_facturacion_con_su_tipo(self):
        from invoices.models import Invoice

        venta = crear_venta(self.cajero, self.lineas, 'tarjeta', documento='factura')
        factura = venta.factura
        self.assertEqual(factura.tipo_documento, 'factura')
        self.assertTrue(factura.numero.startswith('FAC-'))
        self.assertEqual(factura.nombre_cliente, 'Consumidor final')
        self.assertEqual(factura.status, 'pagada')
        self.assertEqual(factura.items.get().cantidad, 2)
        self.assertEqual(factura.total, venta.total)  # misma cifra en el POS y en Facturación
        self.assertEqual(Invoice.objects.filter(tipo_documento='factura').count(), 1)

    def test_credito_fiscal_usa_cliente_y_prefijo_ccf(self):
        venta = crear_venta(self.cajero, self.lineas, 'tarjeta', documento='credito_fiscal',
                            cliente_id=self.cliente_fiscal.id)
        self.assertEqual(venta.factura.tipo_documento, 'credito_fiscal')
        self.assertTrue(venta.factura.numero.startswith('CCF-'))
        self.assertEqual(venta.factura.cliente, self.cliente_fiscal)

    def test_credito_fiscal_exige_cliente_con_nrc(self):
        with self.assertRaises(PosError):
            crear_venta(self.cajero, self.lineas, 'tarjeta', documento='credito_fiscal')
        with self.assertRaises(PosError):
            crear_venta(self.cajero, self.lineas, 'tarjeta', documento='credito_fiscal',
                        cliente_id=self.cliente_sin_nrc.id)
        self.assertEqual(VentaPos.objects.count(), 0)

    def test_ticket_queda_en_facturacion_como_ticket(self):
        venta = crear_venta(self.cajero, self.lineas, 'tarjeta')
        self.assertEqual(venta.factura.tipo_documento, 'ticket')
        self.assertTrue(venta.factura.numero.startswith('TKT-'))

    def test_cajero_sin_permiso_de_facturar_no_puede_facturar(self):
        sin_facturar = User.objects.create_user(username='sin_facturar', password='x')
        sin_facturar.user_permissions.add(permiso('pos.use_pos'))
        sin_facturar = User.objects.get(pk=sin_facturar.pk)
        CajaSesion.objects.create(cajero=sin_facturar)
        api = APIClient()
        api.force_authenticate(sin_facturar)
        api.credentials(HTTP_X_POS_DESBLOQUEO=generar_token(sin_facturar))
        r = api.post('/api/pos/ventas/', {'lineas': self.lineas, 'metodo_pago': 'tarjeta',
                                          'documento': 'factura', 'imprimir': False}, format='json')
        self.assertEqual(r.status_code, 403)
        r = api.post('/api/pos/ventas/', {'lineas': self.lineas, 'metodo_pago': 'tarjeta',
                                          'documento': 'ticket', 'imprimir': False}, format='json')
        self.assertEqual(r.status_code, 201)

    def test_api_devuelve_la_factura_creada(self):
        api = APIClient()
        api.force_authenticate(self.cajero)
        api.credentials(HTTP_X_POS_DESBLOQUEO=generar_token(self.cajero))
        r = api.post('/api/pos/ventas/', {'lineas': self.lineas, 'metodo_pago': 'efectivo',
                                          'monto_recibido': '30', 'documento': 'factura',
                                          'imprimir': False}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['venta']['factura']['tipo_documento'], 'factura')


class CategoriasInventarioTests(TestCase):
    def setUp(self):
        from categories.models import Category

        self.admin = User.objects.create_superuser(username='admin', password='x', email='a@x.com')
        self.producto = Product.objects.create(title='Café', description='d', price=Decimal('1.00'), image='products/c.png', stock=Decimal('100'))
        self.categoria = Category.objects.create(title='Bebidas', description='Calientes y frías')
        self.api = APIClient()
        self.api.force_authenticate(self.admin)

    def test_asignar_categoria_a_producto_desde_inventario(self):
        r = self.api.patch(f'/productos/v1/product/{self.producto.id}/', {'categorias': [self.categoria.id]}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['categorias'], [self.categoria.id])

        r = self.api.get('/api/inventario/categorias/')
        self.assertEqual(r.json()[0]['productos'], [self.producto.id])

    def test_crear_categoria(self):
        r = self.api.post('/api/inventario/categorias/', {'title': 'Snacks', 'description': 'Botanas'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
