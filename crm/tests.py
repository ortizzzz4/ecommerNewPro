from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from users.models import User

from .models import Oportunidad


class CrmTests(TestCase):
    def setUp(self):
        cache.clear()
        self.usuario = User.objects.create_superuser(username='vendedor', password='x', email='v@example.com')
        self.api = APIClient()
        self.api.force_authenticate(self.usuario)

    def test_crear_oportunidad_asigna_al_usuario_y_etapa_inicial(self):
        r = self.api.post('/api/crm/oportunidades/', {
            'titulo': 'Integración con facturación', 'nombre_prospecto': 'Ferretería Sol',
            'valor': '1500.00',
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        oportunidad = Oportunidad.objects.get(pk=r.json()['id'])
        self.assertEqual(oportunidad.etapa, 'nueva')
        self.assertEqual(oportunidad.responsable, self.usuario)

    def test_mover_etapa_y_registrar_actividad(self):
        oportunidad = Oportunidad.objects.create(titulo='Tienda en línea', valor=Decimal('800'))
        r = self.api.patch(f'/api/crm/oportunidades/{oportunidad.pk}/', {'etapa': 'propuesta'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        r = self.api.post('/api/crm/actividades/', {
            'oportunidad': oportunidad.pk, 'tipo': 'llamada', 'descripcion': 'Pidió propuesta por correo',
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        r = self.api.get(f'/api/crm/actividades/?oportunidad={oportunidad.pk}')
        self.assertEqual(len(r.json()), 1)
        self.assertEqual(r.json()[0]['usuario_nombre'], 'vendedor')

    def test_resumen_por_etapa_y_valor_abierto(self):
        Oportunidad.objects.create(titulo='A', etapa='nueva', valor=Decimal('100'))
        Oportunidad.objects.create(titulo='B', etapa='propuesta', valor=Decimal('250'))
        Oportunidad.objects.create(titulo='C', etapa='ganada', valor=Decimal('900'))
        r = self.api.get('/api/crm/oportunidades/resumen/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['valor_abierto'], '350.00')  # la ganada no cuenta como abierta
        por_etapa = {e['etapa']: e['cantidad'] for e in r.json()['etapas']}
        self.assertEqual(por_etapa['ganada'], 1)
        self.assertEqual(por_etapa['perdida'], 0)

    def test_filtrar_por_etapa(self):
        Oportunidad.objects.create(titulo='A', etapa='nueva')
        Oportunidad.objects.create(titulo='B', etapa='ganada')
        r = self.api.get('/api/crm/oportunidades/?etapa=ganada')
        self.assertEqual([o['titulo'] for o in r.json()], ['B'])
