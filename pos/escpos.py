"""Comandos ESC/POS: el lenguaje que entienden la mayoría de impresoras térmicas
(Epson, Xprinter, Bixolon, Star en modo ESC/POS, etc.)."""
import textwrap

INIT = b'\x1b\x40'                       # ESC @   reinicia la impresora
ALIGN = {
    'left': b'\x1b\x61\x00',             # ESC a 0
    'center': b'\x1b\x61\x01',           # ESC a 1
    'right': b'\x1b\x61\x02',            # ESC a 2
}
BOLD_ON = b'\x1b\x45\x01'                # ESC E 1
BOLD_OFF = b'\x1b\x45\x00'               # ESC E 0
SIZE_NORMAL = b'\x1d\x21\x00'            # GS ! 0
SIZE_DOUBLE = b'\x1d\x21\x11'            # GS ! 17  (doble alto y ancho)
CUT = b'\x1d\x56\x42\x00'                # GS V B 0 (corte parcial)
DRAWER_KICK = b'\x1b\x70\x00\x19\xfa'    # ESC p 0 25 250 (abre el cajón de dinero)

# Código para ESC t n según la tabla de caracteres de la impresora
CODEPAGE_CODIGO = {'cp437': 0, 'cp850': 2, 'cp858': 19, 'cp1252': 16}

# Caracteres por línea según el ancho del papel
COLUMNAS = {58: 32, 80: 48}


class Ticket:
    def __init__(self, ancho_papel=80, codepage='cp858'):
        self.columnas = COLUMNAS[ancho_papel]
        self.codepage = codepage
        self._buf = bytearray(INIT)
        self._buf += b'\x1b\x74' + bytes([CODEPAGE_CODIGO[codepage]])

    def _escribir(self, texto):
        self._buf += texto.encode(self.codepage, errors='replace')

    def linea(self, texto='', align='left', bold=False, double=False):
        self._buf += ALIGN[align]
        if bold:
            self._buf += BOLD_ON
        if double:
            self._buf += SIZE_DOUBLE

        ancho = self.columnas // 2 if double else self.columnas
        for parte in textwrap.wrap(texto, ancho) or ['']:
            self._escribir(parte + '\n')

        if double:
            self._buf += SIZE_NORMAL
        if bold:
            self._buf += BOLD_OFF
        self._buf += ALIGN['left']
        return self

    def par(self, izquierda, derecha, bold=False):
        """Texto a la izquierda y valor a la derecha, en la misma línea."""
        espacio = self.columnas - len(izquierda) - len(derecha)
        if espacio < 1:
            izquierda = izquierda[:self.columnas - len(derecha) - 1]
            espacio = 1
        if bold:
            self._buf += BOLD_ON
        self._escribir(f'{izquierda}{" " * espacio}{derecha}\n')
        if bold:
            self._buf += BOLD_OFF
        return self

    def separador(self):
        return self.linea('-' * self.columnas)

    def avanzar(self, lineas=1):
        self._buf += b'\x1b\x64' + bytes([lineas])  # ESC d n
        return self

    def cortar(self):
        self.avanzar(3)
        self._buf += CUT
        return self

    def bytes(self):
        return bytes(self._buf)
