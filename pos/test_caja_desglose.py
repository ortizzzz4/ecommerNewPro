from decimal import Decimal

from django.test import TestCase

from users.models import User

from .models import CajaSesion
from .services import PosError, abrir_caja


class AperturaCajaDesgloseTests(TestCase):
    def setUp(self):
        self.cajero = User.objects.create_user(username='cajero_desglose', password='x')

    def test_suma_billetes_y_monedas_al_monto_inicial(self):
        caja = abrir_caja(self.cajero, desglose={'20': 3, '5': 2, '0.25': 4, '0.01': 10})
        self.assertEqual(caja.monto_inicial, Decimal('71.10'))
        self.assertEqual(caja.desglose_inicial, {'20': 3, '5': 2, '0.25': 4, '0.01': 10})

    def test_ignora_denominaciones_en_cero(self):
        caja = abrir_caja(self.cajero, desglose={'20': 1, '10': 0, '1': ''})
        self.assertEqual(caja.monto_inicial, Decimal('20.00'))
        self.assertEqual(caja.desglose_inicial, {'20': 1})

    def test_denominacion_invalida_no_abre_caja(self):
        with self.assertRaises(PosError):
            abrir_caja(self.cajero, desglose={'3': 1})
        self.assertFalse(CajaSesion.objects.exists())

    def test_sin_desglose_usa_monto_manual(self):
        caja = abrir_caja(self.cajero, monto_inicial='50')
        self.assertEqual(caja.monto_inicial, Decimal('50'))
        self.assertEqual(caja.desglose_inicial, {})
