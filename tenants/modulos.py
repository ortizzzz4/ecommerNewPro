"""Módulos del ERP que una empresa puede contratar al registrarse.

Cada módulo lista los prefijos de API que le pertenecen; el middleware no deja usar
esos prefijos a una empresa que no tenga el módulo. Los módulos base siempre están activos.
"""

MODULOS = {
    'ventas': {'titulo': 'Ventas', 'prefijos': ['/api/cotizaciones/']},
    'pos': {'titulo': 'Punto de venta', 'prefijos': ['/api/pos/']},
    'compras': {'titulo': 'Compras', 'prefijos': ['/api/inventario/compras/', '/api/inventario/recepciones/']},
    'inventario': {'titulo': 'Inventario', 'prefijos': ['/api/inventario/movimientos/', '/api/inventario/productos/']},
    'contabilidad': {'titulo': 'Contabilidad', 'prefijos': ['/api/contabilidad/']},
    'facturacion': {'titulo': 'Facturación', 'prefijos': ['/api/facturas/', '/api/fe/']},
    'crm': {'titulo': 'CRM', 'prefijos': ['/api/crm/']},
}

# Siempre incluidos: la empresa necesita configurarse y administrar a su equipo
MODULOS_BASE = ['configuracion', 'usuarios']
TITULOS_BASE = {'configuracion': 'Configuración', 'usuarios': 'Usuarios'}


def titulo_de(modulo):
    return MODULOS[modulo]['titulo'] if modulo in MODULOS else TITULOS_BASE[modulo]


def modulo_de_ruta(path):
    """Devuelve el módulo que controla una ruta de API, o None si la ruta no depende de un módulo."""
    for modulo, datos in MODULOS.items():
        if any(path.startswith(prefijo) for prefijo in datos['prefijos']):
            return modulo
    return None
