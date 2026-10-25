from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from products.models import Product
from users.models import User


class VisibilidadTiendaTests(TestCase):
    def setUp(self):
        cache.clear()
        self.usuario = User.objects.create_user(username='cliente', password='x')
        self.api = APIClient()
        self.api.force_authenticate(self.usuario)
        self.oculto = Product.objects.create(
            title='Solo interno', description='d', price=Decimal('5.00'), image='products/x.png',
            slug='solo-interno', visible_tienda=False,
        )

    def test_no_se_agrega_al_carrito_un_producto_oculto_en_tienda(self):
        r = self.api.put(f'/api/tienda/carrito/productos/{self.oculto.id}/', {'quantity': 1}, format='json')
        self.assertEqual(r.status_code, 404)
