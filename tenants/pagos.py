from datetime import timedelta

import stripe
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import EmpresaRegistrada, Pago


class PagoError(Exception):
    pass


def activar_pago(pago_id):
    """Marca el pago como pagado y extiende la suscripción de la empresa.

    Si el pago ya estaba confirmado no hace nada, así un webhook repetido no suma días dos veces.
    """
    with transaction.atomic():
        pago = Pago.objects.select_for_update().select_related('plan').get(pk=pago_id)
        if pago.estado == 'pagado':
            return pago

        empresa = EmpresaRegistrada.objects.select_for_update().get(pk=pago.empresa_id)
        ahora = timezone.now()
        # Si la suscripción aún está vigente, el nuevo periodo empieza al terminar el anterior
        inicio = empresa.suscripcion_hasta if empresa.suscripcion_activa else ahora
        empresa.suscripcion_hasta = inicio + timedelta(days=pago.plan.dias)
        empresa.plan = pago.plan
        # La suscripción es de la base: vale para todas sus empresas
        EmpresaRegistrada.objects.filter(db_name=empresa.db_name).update(
            suscripcion_hasta=empresa.suscripcion_hasta, plan=empresa.plan,
        )

        pago.estado = 'pagado'
        pago.confirmado_en = ahora
        pago.save(update_fields=['estado', 'confirmado_en'])
    return pago


def crear_pago_transferencia(empresa, plan):
    return Pago.objects.create(empresa=empresa, plan=plan, metodo='transferencia', monto=plan.precio)


def crear_pago_stripe(empresa, plan, pagina_de_retorno=None):
    """Crea el pago pendiente y la sesión de Stripe Checkout. Devuelve (pago, url_de_pago)."""
    stripe.api_key = settings.STRIPE_PRIVATE_KEY
    pago = Pago.objects.create(empresa=empresa, plan=plan, metodo='stripe', monto=plan.precio)
    base = pagina_de_retorno or settings.FRONTEND_URL
    try:
        sesion = stripe.checkout.Session.create(
            mode='payment',
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'unit_amount': int(plan.precio * 100),
                    'product_data': {'name': f'{plan.nombre} · {empresa.nombre}'},
                },
                'quantity': 1,
            }],
            client_reference_id=str(pago.pk),
            metadata={'pago_id': str(pago.pk), 'empresa': empresa.slug},
            success_url=f'{base}/erp/suscripcion?pago=ok',
            cancel_url=f'{base}/erp/suscripcion?pago=cancelado',
        )
    except stripe.error.StripeError as exc:
        pago.estado = 'rechazado'
        pago.save(update_fields=['estado'])
        raise PagoError('No se pudo iniciar el pago con tarjeta. Intenta de nuevo o paga por transferencia.') from exc

    pago.referencia = sesion.id
    pago.save(update_fields=['referencia'])
    return pago, sesion.url
