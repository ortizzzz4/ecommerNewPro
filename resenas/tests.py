from rest_framework.test import APIClient
from django.test import TestCase

from .models import Resena


class ResenasPublicasTests(TestCase):
    def setUp(self):
        Resena.objects.create(nombre='Ana', texto='Excelente integración', publicada=True)
        Resena.objects.create(nombre='Borrador', texto='Sin revisar', publicada=False)

    def test_solo_muestra_reseñas_publicadas_sin_sesion(self):
        r = APIClient().get('/api/resenas/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual([x['nombre'] for x in r.json()], ['Ana'])
