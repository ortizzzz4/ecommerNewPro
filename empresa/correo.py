"""Envío de correo con la configuración de la empresa activa (la de su propia base de datos).

No cambia la configuración global de Django: cada envío abre su conexión con los datos de la empresa.
"""
from django.core.mail import EmailMultiAlternatives, get_connection

from .models import Empresa


class CorreoError(Exception):
    pass


def configurado(empresa):
    return bool(empresa.correo_servidor and empresa.correo_remitente)


def conexion(empresa):
    if not configurado(empresa):
        raise CorreoError('Falta configurar el correo: servidor y correo remitente.')
    return get_connection(
        host=empresa.correo_servidor,
        port=empresa.correo_puerto,
        username=empresa.correo_usuario or None,
        password=empresa.correo_clave or None,
        use_tls=empresa.correo_seguridad == 'tls',
        use_ssl=empresa.correo_seguridad == 'ssl',
        timeout=20,
    )


def remitente(empresa):
    if empresa.correo_nombre_remitente:
        return f'{empresa.correo_nombre_remitente} <{empresa.correo_remitente}>'
    return empresa.correo_remitente


def enviar(asunto, texto, destinatarios, html=None, empresa=None):
    """Envía un correo desde la empresa activa (o la indicada). Lanza CorreoError si no se pudo."""
    empresa = empresa or Empresa.obtener()
    destinatarios = [d for d in destinatarios if d]
    if not destinatarios:
        raise CorreoError('Indica al menos un destinatario.')
    mensaje = EmailMultiAlternatives(
        asunto, texto, remitente(empresa), destinatarios, connection=conexion(empresa),
    )
    if html:
        mensaje.attach_alternative(html, 'text/html')
    try:
        mensaje.send()
    except Exception as exc:  # el servidor puede rechazar credenciales, puerto o cifrado
        raise CorreoError(f'No se pudo enviar el correo: {exc}') from exc
