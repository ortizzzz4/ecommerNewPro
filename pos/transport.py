"""Envía bytes ESC/POS a la impresora según cómo esté conectada."""
import socket


class PrinterError(Exception):
    pass


def enviar(impresora, datos, timeout=5):
    if impresora.conexion == 'red':
        _enviar_red(impresora.host, impresora.puerto, datos, timeout)
    elif impresora.conexion == 'windows':
        _enviar_windows(impresora.destino, datos)
    elif impresora.conexion == 'dispositivo':
        _enviar_dispositivo(impresora.destino, datos)
    else:
        raise PrinterError('Tipo de conexión no válido.')


def _enviar_red(host, puerto, datos, timeout):
    if not host:
        raise PrinterError('Falta la dirección IP de la impresora.')
    try:
        with socket.create_connection((host, puerto), timeout=timeout) as conexion:
            conexion.sendall(datos)
    except OSError as exc:
        raise PrinterError(f'No se pudo conectar a {host}:{puerto} ({exc}).') from exc


def _enviar_windows(nombre, datos):
    if not nombre:
        raise PrinterError('Falta el nombre de la impresora en Windows.')
    try:
        import win32print
    except ImportError as exc:
        raise PrinterError('Para imprimir por Windows instala pywin32: pip install pywin32.') from exc

    try:
        handle = win32print.OpenPrinter(nombre)
        try:
            win32print.StartDocPrinter(handle, 1, ('Ticket POS', None, 'RAW'))
            win32print.StartPagePrinter(handle)
            win32print.WritePrinter(handle, datos)
            win32print.EndPagePrinter(handle)
            win32print.EndDocPrinter(handle)
        finally:
            win32print.ClosePrinter(handle)
    except Exception as exc:
        raise PrinterError(f'No se pudo imprimir en "{nombre}": {exc}') from exc


def _enviar_dispositivo(ruta, datos):
    if not ruta:
        raise PrinterError('Falta la ruta del dispositivo (por ejemplo COM3 o /dev/usb/lp0).')
    try:
        with open(ruta, 'wb') as dispositivo:
            dispositivo.write(datos)
    except OSError as exc:
        raise PrinterError(f'No se pudo escribir en {ruta} ({exc}).') from exc
