from django.contrib.auth.models import Permission
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from users.models import User


class LoginCarnetTests(TestCase):
    def setUp(self):
        cache.clear()
        self.cajero = User.objects.create_user(username='cajero', password='clave-segura-1', carnet='01234567-8')
        self.cajero.set_pin('4321')
        self.cajero.save()
        self.api = APIClient()

    def test_login_con_usuario(self):
        r = self.api.post('/users/users/login/', {'username': 'cajero', 'password': 'clave-segura-1'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.json())

    def test_login_con_carnet_y_contrasena(self):
        r = self.api.post('/users/users/login/', {'username': '01234567-8', 'password': 'clave-segura-1'}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_login_con_carnet_y_pin(self):
        r = self.api.post('/users/users/login-pin/', {'carnet': '01234567-8', 'pin': '4321'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.json())
        self.assertIn('pos_token', r.json())

    def test_pin_incorrecto_y_bloqueo(self):
        for _ in range(5):
            self.api.post('/users/users/login-pin/', {'carnet': '01234567-8', 'pin': '0000'}, format='json')
        r = self.api.post('/users/users/login-pin/', {'carnet': '01234567-8', 'pin': '4321'}, format='json')
        self.assertEqual(r.status_code, 429)

    def test_carnet_inexistente_no_revela_nada(self):
        r = self.api.post('/users/users/login-pin/', {'carnet': '99999999-9', 'pin': '4321'}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()['detail'], 'Carnet o PIN incorrectos.')

    def test_carnets_repetidos_no_se_permiten(self):
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            User.objects.create_user(username='otro', password='x', carnet='01234567-8')


class CarnetEscaneadoTests(TestCase):
    def setUp(self):
        cache.clear()
        self.cajero = User.objects.create_user(username='cajero2', password='x', carnet='012345678')
        self.cajero.set_pin('4321')
        self.cajero.save()
        self.api = APIClient()

    def test_carnet_escaneado_con_guion_y_caracteres_extra(self):
        # El escáner puede devolver el número con guion o con más datos del código de barras
        for lectura in ['01234567-8', '012345678', '0123456781234']:
            cache.clear()
            r = self.api.post('/users/users/login-pin/', {'carnet': lectura, 'pin': '4321'}, format='json')
            self.assertEqual(r.status_code, 200, lectura)

    def test_carnet_se_guarda_normalizado(self):
        from users.permisos import normalizar_carnet
        self.assertEqual(normalizar_carnet('01234567-8'), '012345678')


class LoginSoloCarnetTests(TestCase):
    def setUp(self):
        cache.clear()
        self.cajero = User.objects.create_user(username='cajero3', password='x', carnet='555666777')
        self.cajero.user_permissions.add(Permission.objects.get(codename='use_pos'))
        self.api = APIClient()

    def test_entra_solo_con_carnet_y_recibe_token_pos(self):
        r = self.api.post('/users/users/login-carnet/', {'carnet': '555666777'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('pos_token', r.json())
        self.assertEqual(r.json()['username'], 'cajero3')

    def test_carnet_escaneado_con_caracteres_extra(self):
        r = self.api.post('/users/users/login-carnet/', {'carnet': '55566677712345'}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_usuario_sin_permiso_pos_no_entra(self):
        User.objects.create_user(username='sinpos', password='x', carnet='111222333')
        r = self.api.post('/users/users/login-carnet/', {'carnet': '111222333'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_carnet_desconocido(self):
        r = self.api.post('/users/users/login-carnet/', {'carnet': '999999999'}, format='json')
        self.assertEqual(r.status_code, 403)
