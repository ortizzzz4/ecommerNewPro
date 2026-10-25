from django.conf import settings

from carts.models import Cart


def build_image_url(product, request):
    if not product.image:
        return None
    return request.build_absolute_uri(product.image.url)


def cart_payload(cart, request):
    cart.refresh_from_db()
    items = []
    for line in cart.cartproducts_set.select_related('product'):
        product = line.product
        items.append({
            'id': product.id,
            'title': product.title,
            'price': f'{product.price:.2f}',
            'image': build_image_url(product, request),
            'quantity': line.quantity,
            'line_total': f'{line.quantity * product.price:.2f}',
        })

    return {
        'items': items,
        'subtotal': f'{cart.subtotal:.2f}',
        'total': f'{cart.total:.2f}',
    }


def billing_profile_payload(profile):
    return {
        'id': profile.id,
        'brand': profile.brand,
        'last4': profile.last4,
        'exp_month': profile.exp_month,
        'exp_year': profile.exp_year,
        'default': profile.default,
    }


def order_payload(order):
    return {
        'id': order.id,
        'order_id': order.order_id,
        'status': str(order.status),
        'shipping_total': f'{order.shipping_total:.2f}',
        'total': f'{order.total:.2f}',
        'created_at': order.created_at,
    }
