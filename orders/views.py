import threading
from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render
from charges.models import Charge
from django.db import transaction
from carts.utils import get_or_create_cart
from shipping_addresses.models import ShippingAddress

from .models import Order
from .utils import destroy_order
from carts.utils import destroy_cart
from .utils import get_or_create_order, breadcrumb

#from .mail import Mail

from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
# Create your views here.

from django.db.models.query import EmptyQuerySet
from django.views.generic import ListView

from .decorador import validar_cart_and_orden


class OrderListView(LoginRequiredMixin, ListView):
    login_url = 'login'
    template_name = 'orders/orders.html'

    def get_queryset(self):
        return self.request.user.orders_completed()


# decorador para que solo los usuarios logeados puedan ver el carrito
@login_required(login_url='login')
@validar_cart_and_orden
def order(request, cart, order):

    if not cart.has_products():
        return redirect('carts:cart')

    return render(request, 'orders/order.html', {
        'cart': cart,
        'order': order,
        'breadcrumb': breadcrumb(),
    })


@login_required(login_url='login')
@validar_cart_and_orden
def address(request, cart, order):  # carrito de compras
    
    if not cart.has_products():
        return redirect('carts:cart')
    
    # obtner la direccion de la orden
    shipping_address = order.get_or_set_shipping_address()
    can_choose_address = request.user.has_shipping_addresses()
    return render(request, 'orders/address.html', {
        'cart': cart,
        'order': order,
        'shipping_address': shipping_address,
        'can_choose_address': can_choose_address,
        'breadcrumb': breadcrumb(address=True),
    })


@login_required(login_url='login')
@validar_cart_and_orden
def select_address(request):
    shipping_addresses = request.user.addresses

    return render(request, 'orders/select_address.html', {
        'breadcrumb': breadcrumb(address=True),
        'shipping_addresses': shipping_addresses
    })


@login_required(login_url='login')
@validar_cart_and_orden
def payment(request, cart, order):

    if not cart.has_products() or order.shipping_address is None:
        return redirect('carts:cart')

    biling_profile = order.get_or_set_billing_profile()

    return render(request, 'orders/payment.html', {
        'cart': cart,
        'order': order,
        'biling_profile': biling_profile,
        'breadcrumb': breadcrumb(address=True, payment=True),
    })


@login_required(login_url='login')
@validar_cart_and_orden
def check_address(request, cart, order, pk):

    shipping_address = get_object_or_404(ShippingAddress, pk=pk)

    if request.user.id != shipping_address.user_id:
        return redirect('carts:cart')

    order.update_shipping_address(shipping_address)

    return redirect('orders:address')


@login_required(login_url='login')
@validar_cart_and_orden
def confirm(request, cart, order):

    
    if not cart.has_products() or order.shipping_address is None or order.billing_profile is None:
        return redirect('carts:cart')

    shipping_address = order.shipping_address
    if shipping_address is None:
        return redirect('orders:address')

    return render(request, 'orders/confirm.html', {
        'cart': cart,
        'order': order,
        'shipping_address': shipping_address,
        'breadcrumb': breadcrumb(address=True, payment=True, confirmation=True)
    })


@login_required(login_url='login')
@validar_cart_and_orden
def cancel(request, cart, order):  # cancelar la orden

    if request.user.id != order.user_id:  # se valida que el usuario sea el unico que pueda cancelar el pedido
        return redirect('carts:cart')

    order.cancel()  # se modifica el estatus de la orden

    # se destruye el carrito y la orden
    destroy_cart(request)
    destroy_order(request)

    # se envia un mensaje de confirmacion
    messages.error(request, 'Orden cancelada')
    return redirect('index')


@login_required(login_url='login')
@validar_cart_and_orden
def complete(request, cart, order):

    if request.user.id != order.user_id:
        return redirect('carts:cart')

    charge = Charge.objects.create_charge(order)
    if charge:  # actulizar status
        with transaction.atomic():# se crea una transaccion para que si algo falla no se guarde nada
            order.complete()
     # Mail.send_complete_order(order, request.user) enviar correo automaticamentesd
        # thread = threading.Thread(target=Mail.send_complete_order, args=(
            #     order, request.user))
            # thread.start()

            destroy_cart(request)
            destroy_order(request)

            messages.success(request, 'Compra, completada exitosamente')
    return redirect('index')
