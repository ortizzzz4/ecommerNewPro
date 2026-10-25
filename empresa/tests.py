from unittest import mock

from django.core import mail
from django.core.mail.backends.locmem import EmailBackend
from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from rest_framework import serializers
from rest_framework.test import APIClient

from .correo import CorreoError, enviar
from .models import Empresa
from .serializers import EmpresaSerializer


class DominioEmpresaTests(SimpleTestCase):
    def _limpiar(self, valor):
        return EmpresaSerializer().validate_dominio(valor)

    def test_quita_protocolo_www_y_barra_final(self):
        self.assertEqual(self._limpiar('https://www.MiEmpresa.com/'), 'miempresa.com')
        self.assertEqual(self._limpiar('  tienda.miempresa.com.sv  '), 'tienda.miempresa.com.sv')

    def test_vacio_se_permite_para_quitar_el_dominio(self):
        self.assertEqual(self._limpiar(''), '')

    def test_rechaza_valores_que_no_son_dominios(self):
        for malo in ['miempresa', 'mi empresa.com', 'http://-malo-.com']:
            with self.subTest(valor=malo), self.assertRaises(serializers.ValidationError):
                self._limpiar(malo)


def _configurar_correo(**extra):
    Empresa.objects.update_or_create(pk=1, defaults={
        'correo_servidor': 'smtp.ejemplo.com', 'correo_puerto': 587, 'correo_seguridad': 'tls',
        'correo_usuario': 'ventas@miempresa.com', 'correo_clave': 'clave-smtp',
        'correo_remitente': 'ventas@miempresa.com', 'correo_nombre_remitente': 'Mi Empresa', **extra,
    })


class CorreoEmpresaTests(TestCase):
    def test_envia_con_el_servidor_y_remitente_de_la_empresa(self):
        _configurar_correo()
        conexiones = []

        def conexion(**kwargs):
            conexiones.append(kwargs)
            return EmailBackend(**kwargs)

        with mock.patch('empresa.correo.get_connection', side_effect=conexion):
            enviar('Hola', 'Texto', ['cliente@example.com'])

        self.assertEqual(conexiones[0]['host'], 'smtp.ejemplo.com')
        self.assertEqual(conexiones[0]['port'], 587)
        self.assertTrue(conexiones[0]['use_tls'])
        self.assertFalse(conexiones[0]['use_ssl'])
        self.assertEqual(conexiones[0]['password'], 'clave-smtp')
        self.assertEqual(mail.outbox[0].from_email, 'Mi Empresa <ventas@miempresa.com>')
        self.assertEqual(mail.outbox[0].to, ['cliente@example.com'])

    def test_ssl_directo_no_activa_starttls(self):
        _configurar_correo(correo_puerto=465, correo_seguridad='ssl')
        with mock.patch('empresa.correo.get_connection', side_effect=lambda **kw: EmailBackend(**kw)) as conexion:
            enviar('Hola', 'Texto', ['a@example.com'])
        self.assertTrue(conexion.call_args.kwargs['use_ssl'])
        self.assertFalse(conexion.call_args.kwargs['use_tls'])

    def test_sin_configuracion_no_intenta_enviar(self):
        Empresa.objects.update_or_create(pk=1, defaults={'correo_servidor': '', 'correo_remitente': ''})
        with self.assertRaises(CorreoError):
            enviar('Hola', 'Texto', ['a@example.com'])
        self.assertEqual(len(mail.outbox), 0)

    def test_la_clave_no_se_devuelve_y_un_valor_vacio_no_la_borra(self):
        _configurar_correo()
        empresa = Empresa.obtener()
        datos = EmpresaSerializer(empresa).data
        self.assertNotIn('correo_clave', datos)
        self.assertTrue(datos['correo_clave_configurada'])

        serializer = EmpresaSerializer(empresa, data={'correo_clave': '', 'correo_servidor': 'smtp.nuevo.com'}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        empresa.refresh_from_db()
        self.assertEqual(empresa.correo_clave, 'clave-smtp')
        self.assertEqual(empresa.correo_servidor, 'smtp.nuevo.com')

    def test_puerto_fuera_de_rango_se_rechaza(self):
        serializer = EmpresaSerializer(Empresa.obtener(), data={'correo_puerto': 70000}, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn('correo_puerto', serializer.errors)


class CorreoPruebaApiTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.admin = get_user_model().objects.create_superuser('admin', 'a@example.com', 'clave-segura-1')
        self.api.force_authenticate(self.admin)

    def test_prueba_envia_el_correo_cuando_esta_configurado(self):
        _configurar_correo()
        r = self.api.post('/api/empresa/correo/probar/', {'destinatario': 'yo@example.com'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(mail.outbox[-1].to, ['yo@example.com'])

    def test_prueba_sin_configurar_explica_que_falta(self):
        Empresa.objects.update_or_create(pk=1, defaults={'correo_servidor': '', 'correo_remitente': ''})
        r = self.api.post('/api/empresa/correo/probar/', {'destinatario': 'yo@example.com'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('Falta configurar', r.json()['detail'])

    def test_sin_sesion_no_se_puede_probar(self):
        self.api.force_authenticate(None)
        r = self.api.post('/api/empresa/correo/probar/', {'destinatario': 'yo@example.com'}, format='json')
        self.assertEqual(r.status_code, 401)
