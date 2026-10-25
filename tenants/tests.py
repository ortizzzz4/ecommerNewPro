from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.hashers import make_password
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from users.models import User

from cuentas.models import AccesoEmpresa, CuentaUsuario

from .bases import alias_de, en_cuenta, en_empresa, eliminar_base_de_datos, nombre_base, registrar, usando
from .models import EmpresaRegistrada, Pago, Plan
from .pagos import activar_pago
from .servicios import RegistroError, crear_empresa, validar_datos

DATOS = {
    'slug': 'demo-ventas', 'nombre': 'Demo Ventas SA', 'correo': 'demo@example.com',
    'usuario': 'admin_demo', 'password': 'clave-segura-1', 'modulos': ['ventas', 'pos'],
}


class RegistroEmpresaTests(TransactionTestCase):
    @classmethod
    def setUpClass(cls):
        # Django necesita conocer el alias antes de crear la clase: se registra y se permite
        cls.databases = {'default', alias_de(nombre_base(DATOS['slug']))}
        registrar(nombre_base(DATOS['slug']))
        super().setUpClass()

    def tearDown(self):
        for empresa in EmpresaRegistrada.objects.all():
            eliminar_base_de_datos(empresa.db_name)
            empresa.delete()

    def test_registro_crea_base_propia_con_usuario_y_prueba_de_30_dias(self):
        empresa = crear_empresa(DATOS)

        self.assertEqual(empresa.db_name, 'tenant_demo_ventas')
        # La fecha de fin se calcula justo antes de guardar: se acepta un margen de un minuto
        self.assertLess(abs((empresa.trial_hasta - empresa.creada) - timedelta(days=30)), timedelta(minutes=1))
        self.assertIn('ventas', empresa.modulos)
        self.assertIn('configuracion', empresa.modulos)  # base, siempre incluido
        self.assertNotIn('facturacion', empresa.modulos)

        with usando(registrar(empresa.db_name)):
            self.assertTrue(User.objects.filter(username='admin_demo', is_superuser=True).exists())
        # El usuario vive solo en la base de la empresa, no en la maestra
        self.assertFalse(User.objects.filter(username='admin_demo').exists())

    def test_valida_slug_repetido_modulos_y_contrasena(self):
        with self.assertRaises(RegistroError):
            validar_datos({**DATOS, 'slug': 'Mi Empresa'})
        with self.assertRaises(RegistroError):
            validar_datos({**DATOS, 'modulos': []})
        with self.assertRaises(RegistroError):
            validar_datos({**DATOS, 'modulos': ['nomina']})
        with self.assertRaises(RegistroError):
            validar_datos({**DATOS, 'password': 'corta'})


class EmpresaApiTests(TransactionTestCase):
    @classmethod
    def setUpClass(cls):
        cls.databases = {'default', alias_de(nombre_base(DATOS['slug']))}
        registrar(nombre_base(DATOS['slug']))
        super().setUpClass()
        # Crear la base cuesta varias migraciones: se crea una vez para toda la clase
        empresa = crear_empresa(DATOS)
        cls.db_name = empresa.db_name

    @classmethod
    def tearDownClass(cls):
        eliminar_base_de_datos(cls.db_name)
        super().tearDownClass()

    def setUp(self):
        # Después de cada prueba Django vacía la base maestra y también la de la empresa,
        # así que el registro y el usuario administrador se vuelven a crear (sin migrar otra vez)
        EmpresaRegistrada.objects.update_or_create(
            slug=DATOS['slug'],
            defaults={
                'nombre': DATOS['nombre'], 'correo': DATOS['correo'], 'db_name': self.db_name,
                'modulos': DATOS['modulos'] + ['configuracion', 'usuarios'],
                'trial_hasta': timezone.now() + timedelta(days=30),
            },
        )
        with usando(registrar(self.db_name)):
            if not User.objects.filter(username=DATOS['usuario']).exists():
                User.objects.create_superuser(username=DATOS['usuario'], email=DATOS['correo'], password=DATOS['password'])
        self.api = APIClient()

    def _login(self, password=DATOS['password']):
        return self.api.post('/api/tenants/login/', {
            'empresa': DATOS['slug'], 'usuario': DATOS['usuario'], 'password': password,
        }, format='json')

    def _autenticar(self):
        r = self._login()
        self.assertEqual(r.status_code, 200, r.content)
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")

    def test_login_y_mi_empresa_muestran_solo_los_modulos_contratados(self):
        self._autenticar()
        r = self.api.get('/api/tenants/mi-empresa/')
        self.assertEqual(r.status_code, 200)
        ids = [m['id'] for m in r.json()['modulos']]
        self.assertIn('ventas', ids)
        self.assertNotIn('facturacion', ids)
        self.assertEqual(r.json()['dias_restantes'], 29)  # 30 días completos, menos el tiempo transcurrido

    def test_el_token_usa_la_base_de_la_empresa(self):
        self._autenticar()
        r = self.api.get('/api/usuarios/yo/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['username'], 'admin_demo')

    def test_modulo_no_contratado_responde_403(self):
        self._autenticar()
        self.assertEqual(self.api.get('/api/facturas/facturas/').status_code, 403)

    def test_contrasena_incorrecta_no_entra(self):
        self.assertEqual(self._login(password='mala-clave').status_code, 401)

    def test_prueba_vencida_solo_permite_consultar(self):
        EmpresaRegistrada.objects.filter(slug=DATOS['slug']).update(trial_hasta=timezone.now() - timedelta(days=1))
        self._autenticar()
        self.assertEqual(self.api.get('/api/tenants/mi-empresa/').status_code, 200)
        r = self.api.post('/api/cotizaciones/cotizaciones/', {}, format='json')
        self.assertEqual(r.status_code, 402)

    def test_pagar_plan_permitido_aunque_la_prueba_haya_vencido(self):
        EmpresaRegistrada.objects.filter(slug=DATOS['slug']).update(trial_hasta=timezone.now() - timedelta(days=1))
        self._autenticar()
        # TransactionTestCase vacía la base maestra, así que el plan se crea aquí
        plan = Plan.objects.get_or_create(codigo='mensual', defaults={'nombre': 'Plan mensual', 'precio': 30, 'dias': 30})[0]
        r = self.api.post('/api/tenants/pagos/transferencia/', {'plan_id': plan.id}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertIn('datos_bancarios', r.json())
        self.assertEqual(r.json()['pago']['estado'], 'Pendiente')


class PagosTests(TestCase):
    """Pagos de suscripción en la base maestra (no requiere base de empresa)."""

    def setUp(self):
        self.plan = Plan.objects.get_or_create(codigo='mensual', defaults={'nombre': 'Plan mensual', 'precio': 30, 'dias': 30})[0]
        self.empresa = EmpresaRegistrada.objects.create(
            slug='pagos-demo', nombre='Pagos Demo', correo='p@example.com', db_name='tenant_pagos_demo',
            modulos=['ventas'], trial_hasta=timezone.now() - timedelta(days=1),
        )

    def test_confirmar_pago_extiende_30_dias_una_sola_vez(self):
        pago = Pago.objects.create(empresa=self.empresa, plan=self.plan, metodo='transferencia', monto=30)
        activar_pago(pago.pk)
        self.empresa.refresh_from_db()
        self.assertTrue(self.empresa.suscripcion_activa)
        primera = self.empresa.suscripcion_hasta
        self.assertFalse(self.empresa.vencida)

        activar_pago(pago.pk)  # un aviso repetido no suma más días
        self.empresa.refresh_from_db()
        self.assertEqual(self.empresa.suscripcion_hasta, primera)

    def test_pago_seguido_extiende_desde_el_fin_del_anterior(self):
        primero = Pago.objects.create(empresa=self.empresa, plan=self.plan, metodo='transferencia', monto=30)
        segundo = Pago.objects.create(empresa=self.empresa, plan=self.plan, metodo='transferencia', monto=30)
        activar_pago(primero.pk)
        self.empresa.refresh_from_db()
        fin_primero = self.empresa.suscripcion_hasta
        activar_pago(segundo.pk)
        self.empresa.refresh_from_db()
        self.assertEqual(self.empresa.suscripcion_hasta, fin_primero + timedelta(days=30))

    def test_webhook_de_stripe_con_firma_invalida_no_activa_nada(self):
        pago = Pago.objects.create(empresa=self.empresa, plan=self.plan, metodo='stripe', monto=30)
        r = APIClient().post('/api/tenants/pagos/stripe/webhook/', {}, format='json',
                             HTTP_STRIPE_SIGNATURE='firma-falsa')
        self.assertEqual(r.status_code, 400)
        pago.refresh_from_db()
        self.assertEqual(pago.estado, 'pendiente')

    @patch('tenants.views.stripe.Webhook.construct_event')
    def test_webhook_de_stripe_activa_el_pago_completado(self, construir):
        pago = Pago.objects.create(empresa=self.empresa, plan=self.plan, metodo='stripe', monto=30)
        construir.return_value = {
            'type': 'checkout.session.completed',
            'data': {'object': {'payment_status': 'paid', 'client_reference_id': str(pago.pk)}},
        }
        r = APIClient().post('/api/tenants/pagos/stripe/webhook/', {}, format='json', HTTP_STRIPE_SIGNATURE='ok')
        self.assertEqual(r.status_code, 200)
        pago.refresh_from_db()
        self.assertEqual(pago.estado, 'pagado')
        self.empresa.refresh_from_db()
        self.assertTrue(self.empresa.suscripcion_activa)


DATOS_B = {**DATOS, 'slug': 'demo-tienda', 'nombre': 'Demo Tienda SA'}


class CambioEntreBasesEsDenegadoTests(TransactionTestCase):
    """Empresas de bases distintas (cuentas distintas) no se pueden cambiar entre sí."""

    @classmethod
    def setUpClass(cls):
        cls.databases = {'default', alias_de(nombre_base(DATOS['slug'])), alias_de(nombre_base(DATOS_B['slug']))}
        registrar(nombre_base(DATOS['slug']))
        registrar(nombre_base(DATOS_B['slug']))
        super().setUpClass()
        cls.db_a = crear_empresa(DATOS).db_name
        cls.db_b = crear_empresa(DATOS_B).db_name

    @classmethod
    def tearDownClass(cls):
        eliminar_base_de_datos(cls.db_a)
        eliminar_base_de_datos(cls.db_b)
        super().tearDownClass()

    def setUp(self):
        for datos, db in [(DATOS, self.db_a), (DATOS_B, self.db_b)]:
            EmpresaRegistrada.objects.update_or_create(
                slug=datos['slug'],
                defaults={
                    'nombre': datos['nombre'], 'correo': datos['correo'], 'db_name': db,
                    'modulos': ['ventas', 'configuracion', 'usuarios'],
                    'trial_hasta': timezone.now() + timedelta(days=30),
                },
            )
            with usando(registrar(db)):
                if not User.objects.filter(username=DATOS['usuario']).exists():
                    User.objects.create_superuser(username=DATOS['usuario'], email=DATOS['correo'], password=DATOS['password'])
        self.api = APIClient()

    def test_no_se_puede_cambiar_a_una_empresa_de_otra_base(self):
        r = self.api.post('/api/tenants/login/', {'empresa': DATOS['slug'], 'usuario': DATOS['usuario'],
                                                  'password': DATOS['password']}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")

        r = self.api.post('/api/tenants/cambiar-empresa/', {'empresa': DATOS_B['slug']}, format='json')
        self.assertEqual(r.status_code, 403)


class EmpresaDePruebasTests(TestCase):
    def test_empresa_de_pruebas_no_vence_aunque_la_prueba_haya_terminado(self):
        vencida = EmpresaRegistrada(slug='x-prueba', nombre='X', correo='x@example.com', db_name='tenant_x',
                                    trial_hasta=timezone.now() - timedelta(days=10))
        self.assertTrue(vencida.vencida)
        vencida.es_prueba = True
        self.assertFalse(vencida.vencida)

    def test_la_plataforma_no_borra_empresas_reales(self):
        from rest_framework.test import APIClient as Cliente
        from django.contrib.auth import get_user_model

        real = EmpresaRegistrada.objects.create(
            slug='empresa-real', nombre='Real', correo='real@example.com', db_name='tenant_empresa_real',
            trial_hasta=timezone.now() + timedelta(days=30),
        )
        admin = get_user_model().objects.create_superuser('plataforma', 'p@example.com', 'clave-segura-1')
        api = Cliente()
        api.force_authenticate(admin)
        r = api.delete(f'/api/tenants/admin/empresas/{real.pk}/')
        self.assertEqual(r.status_code, 400)
        self.assertTrue(EmpresaRegistrada.objects.filter(pk=real.pk).exists())


DATOS_MISMA_BASE = {'slug': 'demo-tienda', 'nombre': 'Demo Tienda SA', 'correo': DATOS['correo'], 'modulos': ['ventas']}
DATOS_DESDE_SESION = {'slug': 'tercera-empresa', 'nombre': 'Tercera SA', 'modulos': ['ventas']}


class EmpresasEnUnaBaseTests(TransactionTestCase):
    """Dos empresas de la misma cuenta comparten base de datos, pero cada una tiene sus registros."""

    @classmethod
    def setUpClass(cls):
        base = nombre_base(DATOS['slug'])
        cls.databases = {'default', alias_de(base)}
        registrar(base)
        super().setUpClass()
        cls.a = crear_empresa(DATOS)
        cls.b = crear_empresa(DATOS_MISMA_BASE, cuenta=cls.a)

    @classmethod
    def tearDownClass(cls):
        eliminar_base_de_datos(cls.a.db_name)
        super().tearDownClass()

    def setUp(self):
        for datos, empresa in [(DATOS, self.a), (DATOS_MISMA_BASE, self.b)]:
            EmpresaRegistrada.objects.update_or_create(
                slug=datos['slug'],
                defaults={
                    'nombre': empresa.nombre, 'correo': DATOS['correo'], 'db_name': empresa.db_name,
                    'esquema': empresa.esquema, 'modulos': ['ventas', 'configuracion', 'usuarios'],
                    'trial_hasta': timezone.now() + timedelta(days=30), 'bloqueada': False,
                },
            )
        # La limpieza entre pruebas vacía el esquema público: el usuario de la primera empresa y su cuenta se vuelven a crear
        with en_empresa(self.a):
            if not User.objects.filter(username=DATOS['usuario']).exists():
                User.objects.create_superuser(username=DATOS['usuario'], email=DATOS['correo'], password=DATOS['password'])
        with en_cuenta(self.a.db_name):
            CuentaUsuario.objects.exclude(username=DATOS['usuario']).delete()
            cuenta, _ = CuentaUsuario.objects.update_or_create(
                username=DATOS['usuario'],
                defaults={'email': DATOS['correo'], 'password': make_password(DATOS['password']), 'activo': True},
            )
            for empresa in [self.a, self.b]:
                AccesoEmpresa.objects.update_or_create(
                    cuenta=cuenta, empresa_slug=empresa.slug, defaults={'rol': 'Administrador'},
                )
        self.api = APIClient()

    def _login(self, usuario=DATOS['usuario'], password=DATOS['password'], empresa=DATOS['slug']):
        return self.api.post('/api/tenants/login/', {
            'empresa': empresa, 'usuario': usuario, 'password': password,
        }, format='json')

    def _entrar(self):
        r = self._login()
        self.assertEqual(r.status_code, 200, r.content)
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")

    def test_la_segunda_empresa_va_en_la_misma_base_y_en_su_propio_esquema(self):
        self.assertEqual(self.a.db_name, self.b.db_name)
        self.assertEqual(self.a.esquema, 'public')
        self.assertEqual(self.b.esquema, 'emp_demo_tienda')

    def test_los_registros_de_cada_empresa_no_se_mezclan(self):
        from categories.models import Category

        with en_empresa(self.a):
            Category.objects.create(title='Solo de la primera')
        with en_empresa(self.b):
            self.assertEqual(Category.objects.count(), 0)
            Category.objects.create(title='Solo de la segunda')
            self.assertEqual(list(Category.objects.values_list('title', flat=True)), ['Solo de la segunda'])
        with en_empresa(self.a):
            self.assertEqual(list(Category.objects.values_list('title', flat=True)), ['Solo de la primera'])

    def test_el_administrador_entra_con_una_sola_contrasena_a_todas_sus_empresas(self):
        self._entrar()
        slugs = {e['empresa'] for e in self.api.get('/api/tenants/mis-empresas/').json()}
        self.assertEqual(slugs, {DATOS['slug'], DATOS_MISMA_BASE['slug']})

        r = self.api.post('/api/tenants/cambiar-empresa/', {'empresa': DATOS_MISMA_BASE['slug']}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")
        self.assertEqual(self.api.get('/api/tenants/mi-empresa/').json()['empresa'], DATOS_MISMA_BASE['slug'])

    def test_desde_la_sesion_se_agrega_una_empresa_a_la_misma_base(self):
        self._entrar()
        # Sin identificador: se genera a partir del nombre
        r = self.api.post('/api/tenants/empresas/nueva/', {'nombre': 'Tercera Empresa', 'modulos': ['ventas']}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(EmpresaRegistrada.objects.get(slug='tercera-empresa').db_name, self.a.db_name)

        slugs = {e['empresa'] for e in self.api.get('/api/tenants/mis-empresas/').json()}
        self.assertEqual(slugs, {DATOS['slug'], DATOS_MISMA_BASE['slug'], 'tercera-empresa'})

    def test_genera_identificadores_sin_repetir(self):
        from .servicios import generar_slug
        self.assertEqual(generar_slug('Ferretería El Sol'), 'ferreteria-el-sol')
        self.assertEqual(generar_slug('Demo Ventas'), 'demo-ventas-2')

    def test_no_repite_un_identificador_existente(self):
        self._entrar()
        r = self.api.post('/api/tenants/empresas/nueva/', {**DATOS_DESDE_SESION, 'slug': DATOS_MISMA_BASE['slug']}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_admin_crea_usuario_con_acceso_solo_a_una_empresa(self):
        self._entrar()
        r = self.api.post('/api/tenants/cuenta/usuarios/', {
            'username': 'vendedor1', 'email': 'v1@example.com', 'nombre': 'Vendedor Uno',
            'password': 'clave-vendedor-1', 'accesos': [{'empresa': DATOS['slug'], 'rol': 'Vendedor'}],
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)

        # Mismas credenciales en su empresa asignada...
        r = self._login(usuario='vendedor1', password='clave-vendedor-1')
        self.assertEqual(r.status_code, 200, r.content)
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")
        self.assertEqual(self.api.get('/api/tenants/mi-empresa/').json()['empresa'], DATOS['slug'])
        # ...pero no puede usar la otra empresa de la cuenta ni administrar usuarios
        self.assertEqual(self._login(usuario='vendedor1', password='clave-vendedor-1',
                                     empresa=DATOS_MISMA_BASE['slug']).status_code, 403)
        self.assertEqual(self.api.get('/api/tenants/cuenta/usuarios/').status_code, 403)

    def test_cambiar_la_contrasena_del_administrador_aplica_en_todas_sus_empresas(self):
        self._entrar()
        with en_cuenta(self.a.db_name):
            cuenta = CuentaUsuario.objects.get(username=DATOS['usuario'])
        r = self.api.patch(f'/api/tenants/cuenta/usuarios/{cuenta.pk}/', {'password': 'clave-nueva-99'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self._login(password=DATOS['password']).status_code, 401)
        self.assertEqual(self._login(password='clave-nueva-99', empresa=DATOS_MISMA_BASE['slug']).status_code, 200)
        self.assertEqual(self._login(password='clave-nueva-99').status_code, 200)

    def _poner_empresa(self, **campos):
        EmpresaRegistrada.objects.filter(slug=DATOS['slug']).update(**campos)

    def test_base_bloqueada_deja_entrar_pero_no_usar_los_modulos(self):
        self._poner_empresa(bloqueada=True)
        self._entrar()
        r = self.api.get('/api/cotizaciones/cotizaciones/')
        self.assertEqual(r.status_code, 403)
        self.assertIn('bloqueada', r.json()['detail'])
        self.assertEqual(r.json()['bloqueo'], 'bloqueada')
        self.assertTrue(self.api.get('/api/tenants/mi-empresa/').json()['bloqueada'])

    def test_base_vencida_deja_entrar_pero_no_usar_los_modulos(self):
        self._poner_empresa(trial_hasta=timezone.now() - timedelta(days=1))
        self._entrar()
        r = self.api.get('/api/cotizaciones/cotizaciones/')
        self.assertEqual(r.status_code, 402)
        self.assertIn('expirado', r.json()['detail'])
        self.assertEqual(r.json()['bloqueo'], 'vencida')
        self.assertTrue(self.api.get('/api/tenants/mi-empresa/').json()['vencida'])

    def test_los_usuarios_de_la_cuenta_viven_en_el_esquema_cuenta_de_la_base(self):
        from django.db import connections

        alias = alias_de(self.a.db_name)
        with connections[alias].cursor() as cur:
            cur.execute("SELECT table_schema FROM information_schema.tables WHERE table_name = 'cuentas_cuentausuario'")
            esquemas = [fila[0] for fila in cur.fetchall()]
        self.assertEqual(esquemas, ['cuenta'])
        with en_cuenta(self.a.db_name):
            self.assertTrue(CuentaUsuario.objects.filter(username=DATOS['usuario']).exists())

    def test_usuario_creado_desde_la_empresa_queda_en_la_base_de_la_cuenta(self):
        self._entrar()
        r = self.api.post('/api/usuarios/usuarios/', {
            'username': 'sv2', 'email': 'sv2@example.com', 'first_name': 'Sv Dos',
            'password': 'clave-sv2-12345', 'is_active': True,
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        with en_cuenta(self.a.db_name):
            self.assertTrue(CuentaUsuario.objects.filter(username='sv2').exists())
        self.assertEqual(self._login(usuario='sv2', password='clave-sv2-12345').status_code, 200)

        self._entrar()
        datos = self.api.get('/api/usuarios/usuarios/').json()
        lista = datos['results'] if isinstance(datos, dict) else datos
        self.assertIn('sv2', [u['username'] for u in lista])

    def test_bloquear_una_empresa_bloquea_toda_la_base(self):
        plataforma = User.objects.create_superuser('plataforma-base', 'pb@example.com', 'clave-segura-1')
        api = APIClient()
        api.force_authenticate(plataforma)
        pk = EmpresaRegistrada.objects.get(slug=DATOS['slug']).pk

        r = api.patch(f'/api/tenants/admin/empresas/{pk}/', {'bloqueada': True}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(EmpresaRegistrada.objects.get(slug=DATOS_MISMA_BASE['slug']).bloqueada)

    def test_el_pago_es_de_la_base_y_se_ve_en_todas_sus_empresas(self):
        from .models import Pago, Plan

        titular = EmpresaRegistrada.objects.get(slug=DATOS_MISMA_BASE['slug']).titular
        self.assertEqual(titular.slug, DATOS['slug'])
        plan = Plan.objects.create(codigo='mensual', nombre='Mensual', precio='10.00', dias=30)
        Pago.objects.create(empresa=titular, plan=plan, metodo='transferencia', monto='10.00')

        self._entrar()
        self.assertEqual(len(self.api.get('/api/tenants/pagos/').json()), 1)
        r = self.api.post('/api/tenants/cambiar-empresa/', {'empresa': DATOS_MISMA_BASE['slug']}, format='json')
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")
        self.assertEqual(len(self.api.get('/api/tenants/pagos/').json()), 1)
