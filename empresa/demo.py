"""Datos de demostración: productos, categorías y contactos de ejemplo.

Todo lo creado queda marcado con es_demo=True. Al desactivarlos solo se borra lo que no
tenga ventas, facturas ni movimientos asociados, así nunca se pierde información real.
"""
import os
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import ProtectedError

from categories.models import Category
from contacts.models import Contact
from inventario.models import ComponenteProducto
from quotations.models import Quotation
from products.models import Product

# Imágenes de demostración: se generan en MEDIA_ROOT/products/demo al activar los datos
def _asegurar_imagen(titulo, color, nombre_archivo):
    from PIL import Image, ImageDraw

    relativa = f'products/demo/{nombre_archivo}'
    ruta = os.path.join(settings.MEDIA_ROOT, relativa)
    if not os.path.exists(ruta):
        os.makedirs(os.path.dirname(ruta), exist_ok=True)
        imagen = Image.new('RGB', (480, 480), color)
        dibujo = ImageDraw.Draw(imagen)
        dibujo.rectangle([24, 24, 456, 456], outline='white', width=6)
        dibujo.text((40, 200), titulo, fill='white')
        imagen.save(ruta, 'PNG')
    return relativa


CATEGORIAS = [
    ('Bebidas', 'Bebidas calientes y frías'),
    ('Alimentos', 'Panadería y comida preparada'),
    ('Papelería', 'Artículos de oficina para uso interno'),
    ('Servicios', 'Servicios que no requieren inventario'),
]

PRODUCTOS = [
    {'title': 'Café americano', 'description': 'Taza de café de 12 oz', 'price': '1.50',
     'tipo': 'bien', 'stock': '100', 'categorias': ['Bebidas'],
     'codigo_barras': '7700000000011', 'color': '#78350f', 'archivo': 'cafe.png'},
    {'title': 'Pan dulce', 'description': 'Pan dulce artesanal', 'price': '0.75',
     'tipo': 'bien', 'stock': '60', 'categorias': ['Alimentos'],
     'codigo_barras': '7700000000028', 'color': '#b45309', 'archivo': 'pan.png'},
    {'title': 'Papel bond carta', 'description': 'Resma de 500 hojas, uso interno', 'price': '5.00',
     'tipo': 'bien', 'stock': '40', 'categorias': ['Papelería'],
     'visible_pos': False, 'visible_tienda': False,
     'codigo_barras': '7700000000035', 'color': '#475569', 'archivo': 'papel.png'},
    {'title': 'Combo desayuno', 'description': 'Café americano + pan dulce', 'price': '2.00',
     'tipo': 'combo', 'categorias': ['Alimentos'],
     'componentes': [('Café americano', '1'), ('Pan dulce', '1')],
     'codigo_barras': '7700000000042', 'color': '#7c3aed', 'archivo': 'combo.png'},
    {'title': 'Instalación de equipo', 'description': 'Servicio de instalación en sitio', 'price': '25.00',
     'tipo': 'servicio', 'categorias': ['Servicios'], 'visible_pos': False,
     'color': '#0f766e', 'archivo': 'instalacion.png'},
]

CONTACTOS = [
    {'nombre': 'Consumidor final demo', 'tipo': 'cliente', 'tipo_persona': 'natural'},
    {'nombre': 'Empresa Demo S.A. de C.V.', 'tipo': 'cliente', 'tipo_persona': 'juridica',
     'nit': '0614-010190-101-1', 'nrc': '123456-7', 'email': 'compras@demo.example'},
    {'nombre': 'Distribuidora Demo', 'tipo': 'proveedor', 'tipo_persona': 'juridica',
     'nit': '0614-020290-102-2', 'nrc': '654321-0', 'email': 'ventas@demo.example'},
]


def activar_datos_demo():
    """Crea los datos de ejemplo que falten. Se puede llamar varias veces sin duplicar nada."""
    creados = {'productos': 0, 'categorias': 0, 'contactos': 0}

    with transaction.atomic():
        categorias = {}
        for titulo, descripcion in CATEGORIAS:
            categoria, nueva = Category.objects.get_or_create(
                title=titulo, es_demo=True, defaults={'description': descripcion},
            )
            categorias[titulo] = categoria
            creados['categorias'] += nueva

        productos = {}
        for datos in PRODUCTOS:
            producto, nuevo = Product.objects.get_or_create(
                title=datos['title'], es_demo=True,
                defaults={
                    'codigo_barras': datos.get('codigo_barras'),
                    'description': datos['description'],
                    'price': Decimal(datos['price']),
                    'tipo': datos['tipo'],
                    'stock': Decimal(datos.get('stock', '0')),
                    'visible_pos': datos.get('visible_pos', True),
                    'visible_ventas': True,
                    'visible_compras': True,
                    'visible_tienda': datos.get('visible_tienda', True),
                },
            )
            imagen = _asegurar_imagen(datos['title'], datos['color'], datos['archivo'])
            if not producto.image:
                producto.image = imagen
                producto.save(update_fields=['image'])
            productos[datos['title']] = producto
            creados['productos'] += nuevo
            for titulo in datos.get('categorias', []):
                producto.category_set.add(categorias[titulo])

        for datos in PRODUCTOS:
            for nombre_componente, cantidad in datos.get('componentes', []):
                ComponenteProducto.objects.get_or_create(
                    padre=productos[datos['title']], componente=productos[nombre_componente],
                    defaults={'cantidad': Decimal(cantidad)},
                )

        for datos in CONTACTOS:
            _, nuevo = Contact.objects.get_or_create(
                nombre=datos['nombre'], es_demo=True,
                defaults={k: v for k, v in datos.items() if k != 'nombre'},
            )
            creados['contactos'] += nuevo

    return creados


def quitar_datos_demo():
    """Borra los datos de demostración que no estén usados. Devuelve lo borrado y lo conservado."""
    borrados = {'productos': 0, 'categorias': 0, 'contactos': 0}
    conservados = []

    # Primero los combos (usan a los demás como componentes)
    for producto in Product.objects.filter(es_demo=True).order_by('-tipo'):
        try:
            with transaction.atomic():
                producto.delete()
            borrados['productos'] += 1
        except ProtectedError:
            conservados.append(f'producto "{producto.title}"')

    for categoria in Category.objects.filter(es_demo=True):
        categoria.delete()
        borrados['categorias'] += 1

    for contacto in Contact.objects.filter(es_demo=True):
        # Las facturas y cotizaciones quedarían sin cliente: si existen, el contacto se conserva
        if contacto.facturas.exists() or Quotation.objects.filter(cliente=contacto).exists():
            conservados.append(f'contacto "{contacto.nombre}"')
            continue
        try:
            with transaction.atomic():
                contacto.delete()
            borrados['contactos'] += 1
        except ProtectedError:
            conservados.append(f'contacto "{contacto.nombre}"')

    return {'borrados': borrados, 'conservados': conservados}
