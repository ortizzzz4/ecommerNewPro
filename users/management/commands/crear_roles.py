from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand

# Roles base. Cada entrada es "app_label.codename" (por ejemplo "invoices.view_invoice").
ROLES = {
    'Administrador': None,  # None = todos los permisos
    'Vendedor': [
        'contacts.view_contact', 'contacts.add_contact', 'contacts.change_contact',
        'products.view_product', 'categories.view_category',
        'quotations.view_quotation', 'quotations.add_quotation', 'quotations.change_quotation',
        'invoices.view_invoice',
        'pos.use_pos',
        'crm.view_oportunidad', 'crm.add_oportunidad', 'crm.change_oportunidad',
        'crm.view_actividad', 'crm.add_actividad',
    ],
    'Cajero': [
        'pos.use_pos', 'pos.view_ventapos',
        'products.view_product', 'categories.view_category',
        'contacts.view_contact',
        'invoices.add_invoice', 'invoices.view_invoice',  # facturas y crédito fiscal desde el POS
    ],
    'Compras': [
        'contacts.view_contact', 'contacts.add_contact', 'contacts.change_contact',
        'products.view_product', 'products.add_product', 'products.change_product',
        'categories.view_category', 'categories.add_category', 'categories.change_category',
        'categories.delete_category',
        'inventario.view_movimientoinventario', 'inventario.add_movimientoinventario',
        'inventario.view_compra', 'inventario.add_compra',
        'inventario.view_recepcion', 'inventario.change_recepcion',
    ],
    'Contador': [
        'invoices.view_invoice', 'invoices.change_invoice',
        'quotations.view_quotation',
        'pos.view_ventapos',
        'accountant.view_cuenta', 'accountant.view_asiento', 'accountant.view_partida',
        'accountant.add_asiento', 'accountant.change_asiento', 'accountant.add_cuenta',
    ],
}


class Command(BaseCommand):
    help = 'Crea los roles base (Administrador, Vendedor, Cajero, Compras, Contador) con sus permisos.'

    def handle(self, *args, **options):
        for nombre, codigos in ROLES.items():
            rol, _ = Group.objects.get_or_create(name=nombre)

            if codigos is None:
                permisos = Permission.objects.all()
            else:
                permisos = []
                for codigo in codigos:
                    app_label, codename = codigo.split('.')
                    permisos.append(Permission.objects.get(content_type__app_label=app_label, codename=codename))

            rol.permissions.set(permisos)
            self.stdout.write(self.style.SUCCESS(f'{nombre}: {len(permisos)} permisos'))
