from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from stripeAPI import stripe
from biling_profiles.models import BilingProfile
from carts.models import Cart, CartProducts
from charges.models import Charge
from orders.commo import OrderStatus
from orders.models import Order
from inventario.services import StockError, descontar
from products.models import Product

from .serializers import billing_profile_payload, cart_payload, order_payload

MAX_QUANTITY = 99


class PagoNoProcesado(Exception):
    pass


def get_user_cart(user):
    cart = Cart.objects.filter(user=user).order_by('-created_at').first()
    return cart or Cart.objects.create(user=user)


def stripe_error_response(exc):
    detail = getattr(exc, 'user_message', None) or str(exc)
    return Response({'detail': detail}, status=status.HTTP_402_PAYMENT_REQUIRED)


class StripeConfigView(APIView):
    def get(self, request):
        return Response({'stripe_public_key': settings.STRIPE_PUBLIC_KEY})


class CartView(APIView):
    def get(self, request):
        cart = get_user_cart(request.user)
        return Response(cart_payload(cart, request))

    def delete(self, request):
        cart = get_user_cart(request.user)
        cart.cartproducts_set.all().delete()
        cart.update_totals()
        return Response(cart_payload(cart, request))


class CartItemView(APIView):
    def put(self, request, product_id):
        # Un producto con "Tienda en línea" apagado no se puede comprar
        product = get_object_or_404(Product, pk=product_id, visible_tienda=True)

        try:
            quantity = int(request.data.get('quantity', 1))
        except (TypeError, ValueError):
            return Response({'detail': 'La cantidad debe ser un número entero.'}, status=status.HTTP_400_BAD_REQUEST)

        if not 0 <= quantity <= MAX_QUANTITY:
            return Response(
                {'detail': f'La cantidad debe estar entre 0 y {MAX_QUANTITY}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart = get_user_cart(request.user)
        if quantity == 0:
            CartProducts.objects.filter(cart=cart, product=product).delete()
            cart.update_totals()
        else:
            CartProducts.objects.update_or_create(cart=cart, product=product, defaults={'quantity': quantity})

        return Response(cart_payload(cart, request))

    def delete(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        cart = get_user_cart(request.user)
        CartProducts.objects.filter(cart=cart, product=product).delete()
        cart.update_totals()
        return Response(cart_payload(cart, request))


class BilingProfilesView(APIView):
    def get(self, request):
        profiles = request.user.biling_profiles
        return Response([billing_profile_payload(profile) for profile in profiles])

    def post(self, request):
        token = request.data.get('stripeToken')
        if not token:
            return Response({'detail': 'Falta el token de la tarjeta.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        try:
            if not user.has_customer():
                user.create_customer_id()
            profile = BilingProfile.objects.create_by_stripe_token(user, token)
        except stripe.error.StripeError as exc:
            return stripe_error_response(exc)

        if profile is None:
            return Response({'detail': 'No se pudo guardar la tarjeta.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(billing_profile_payload(profile), status=status.HTTP_201_CREATED)


class OrderView(APIView):
    def post(self, request):
        cart = get_user_cart(request.user)
        if not cart.has_products():
            return Response({'detail': 'Tu carrito está vacío.'}, status=status.HTTP_400_BAD_REQUEST)

        order = cart.order or Order.objects.create(cart=cart, user=request.user)
        return Response(order_payload(order), status=status.HTTP_201_CREATED)


class OrderPayView(APIView):
    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)
        # El estado se guarda como texto ('OrderStatus.CREATED'), igual que en Cart.order
        if order.status != str(OrderStatus.CREATED):
            return Response({'detail': 'Este pedido ya no está pendiente de pago.'}, status=status.HTTP_400_BAD_REQUEST)

        billing_id = request.data.get('billing_profile_id')
        if not billing_id:
            return Response({'detail': 'Selecciona un método de pago.'}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.has_customer():
            return Response({'detail': 'Agrega un método de pago antes de comprar.'}, status=status.HTTP_400_BAD_REQUEST)

        billing = get_object_or_404(BilingProfile, pk=billing_id, user=request.user)
        order.update_billing_profile(billing)

        try:
            # Todo o nada: si el cobro falla, el stock reservado vuelve a su lugar
            with transaction.atomic():
                lineas = [
                    (linea.product, linea.quantity)
                    for linea in order.cart.cartproducts_set.select_related('product')
                ]
                descontar(lineas, motivo='Venta en tienda en línea', referencia=order.order_id, usuario=request.user)

                charge = Charge.objects.create_charge(order)
                if charge is None:
                    raise PagoNoProcesado()

                order.complete()
                cart = order.cart
                cart.cartproducts_set.all().delete()
                cart.update_totals()
        except StockError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except PagoNoProcesado:
            return Response({'detail': 'No se pudo procesar el pago.'}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.StripeError as exc:
            return stripe_error_response(exc)

        return Response(order_payload(order))
