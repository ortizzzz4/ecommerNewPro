from decimal import Decimal, InvalidOperation

from django.db.models import Sum, F, DecimalField
from django.shortcuts import get_object_or_404
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from contacts.models import Contact
from products.models import Product
from users.permisos import PermisoPorModelo

from .models import Compra, ComponenteProducto, MovimientoInventario, Recepcion
from .services import CompraError, RecepcionError, StockError, confirmar_recepcion, crear_compra, registrar_movimiento


class MovimientoSerializer(serializers.ModelSerializer):
    producto_id = serializers.IntegerField(source='producto.id', read_only=True)
    producto_nombre = serializers.CharField(source='producto.title', read_only=True)
    usuario = serializers.CharField(source='usuario.username', read_only=True, default=None)

    class Meta:
        model = MovimientoInventario
        fields = ['id', 'producto_id', 'producto_nombre', 'tipo', 'cantidad', 'motivo', 'referencia', 'usuario', 'creado']


class MovimientoViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = MovimientoSerializer
    queryset = MovimientoInventario.objects.select_related('producto', 'usuario')
    permission_classes = [PermisoPorModelo]

    def create(self, request):
        datos = request.data
        producto = get_object_or_404(Product, pk=datos.get('producto_id'))
        tipo = datos.get('tipo', 'entrada')
        if tipo not in ('entrada', 'ajuste'):
            return Response({'detail': 'El tipo debe ser "entrada" o "ajuste".'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            cantidad = Decimal(str(datos.get('cantidad')))
        except (InvalidOperation, TypeError):
            return Response({'detail': 'La cantidad no es válida.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            movimiento = registrar_movimiento(producto, tipo, cantidad, datos.get('motivo', ''), request.user)
        except StockError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MovimientoSerializer(movimiento).data, status=status.HTTP_201_CREATED)


class RecepcionLineaSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    producto_id = serializers.IntegerField(source='producto.id', read_only=True)
    producto_nombre = serializers.CharField(source='producto.title', read_only=True)
    cantidad_esperada = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    cantidad_recibida = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)


class RecepcionSerializer(serializers.ModelSerializer):
    compra_id = serializers.IntegerField(source='compra.id', read_only=True)
    proveedor_nombre = serializers.CharField(source='compra.proveedor.nombre', read_only=True)
    recibida_por = serializers.CharField(source='recibida_por.username', read_only=True, default=None)
    lineas = RecepcionLineaSerializer(many=True, read_only=True)

    class Meta:
        model = Recepcion
        fields = ['id', 'compra_id', 'proveedor_nombre', 'estado', 'creado', 'recibida_en', 'recibida_por', 'lineas']


class CompraSerializer(serializers.ModelSerializer):
    proveedor_id = serializers.IntegerField(source='proveedor.id', read_only=True)
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    total = serializers.SerializerMethodField()
    recepcion_id = serializers.IntegerField(source='recepcion.id', read_only=True)
    estado_recepcion = serializers.CharField(source='recepcion.estado', read_only=True)

    class Meta:
        model = Compra
        fields = ['id', 'proveedor_id', 'proveedor_nombre', 'notas', 'creado', 'total', 'recepcion_id', 'estado_recepcion']

    def get_total(self, compra):
        total = compra.lineas.aggregate(
            total=Sum(F('cantidad') * F('costo_unitario'), output_field=DecimalField(max_digits=14, decimal_places=2))
        )['total']
        return f'{total or Decimal("0"):.2f}'


class CompraViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = CompraSerializer
    queryset = Compra.objects.select_related('proveedor', 'recepcion')
    permission_classes = [PermisoPorModelo]

    def create(self, request):
        datos = request.data
        proveedor = get_object_or_404(Contact, pk=datos.get('proveedor_id'))
        if proveedor.tipo not in ('proveedor', 'ambos') or not proveedor.activo:
            return Response({'detail': 'El contacto no es un proveedor activo.'}, status=status.HTTP_400_BAD_REQUEST)

        lineas = []
        for linea in datos.get('lineas') or []:
            try:
                producto = Product.objects.get(pk=linea['producto_id'])
                cantidad = Decimal(str(linea.get('cantidad')))
                costo = Decimal(str(linea.get('costo_unitario', 0)))
            except (Product.DoesNotExist, KeyError, InvalidOperation, TypeError):
                return Response({'detail': 'Producto, cantidad o costo no válidos.'}, status=status.HTTP_400_BAD_REQUEST)
            lineas.append((producto, cantidad, costo))

        try:
            compra = crear_compra(proveedor, lineas, usuario=request.user, notas=datos.get('notas', ''))
        except CompraError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CompraSerializer(compra).data, status=status.HTTP_201_CREATED)


class PuedeRecibir(BasePermission):
    """Confirmar una recepción mueve existencias: exige cambiar recepciones."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_perm('inventario.change_recepcion')


class RecepcionViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = RecepcionSerializer
    queryset = Recepcion.objects.select_related('compra__proveedor', 'recibida_por').prefetch_related('lineas__producto')
    permission_classes = [PermisoPorModelo]

    @action(detail=True, methods=['post'], permission_classes=[PuedeRecibir])
    def confirmar(self, request, pk=None):
        """Body opcional: {"lineas": [{"id": <linea>, "cantidad_recibida": <n>}]}. Sin body recibe lo esperado."""
        recepcion = self.get_object()
        cantidades = {}
        for linea in request.data.get('lineas') or []:
            try:
                cantidades[int(linea['id'])] = Decimal(str(linea['cantidad_recibida']))
            except (KeyError, InvalidOperation, TypeError, ValueError):
                return Response({'detail': 'Línea o cantidad recibida no válida.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            recepcion = confirmar_recepcion(recepcion, cantidades, usuario=request.user)
        except RecepcionError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except StockError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(RecepcionSerializer(recepcion).data)


class PuedeVerProductos(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        codename = 'view_product' if request.method in SAFE_METHODS else 'change_product'
        return user.has_perm(f'products.{codename}')


class ComponentesView(APIView):
    """Lista o reemplaza los componentes de un combo o kit."""
    permission_classes = [PuedeVerProductos]

    def _payload(self, producto):
        return [
            {'componente_id': c.componente_id, 'nombre': c.componente.title, 'cantidad': f'{c.cantidad:.2f}'}
            for c in producto.componentes.select_related('componente')
        ]

    def get(self, request, pk):
        return Response(self._payload(get_object_or_404(Product, pk=pk)))

    def put(self, request, pk):
        producto = get_object_or_404(Product, pk=pk)
        if producto.tipo not in ('combo', 'kit'):
            return Response({'detail': 'Solo los combos y kits tienen componentes.'}, status=status.HTTP_400_BAD_REQUEST)

        nuevos = []
        for linea in request.data:
            try:
                componente = Product.objects.get(pk=linea['componente_id'])
                cantidad = Decimal(str(linea.get('cantidad', 1)))
            except (Product.DoesNotExist, KeyError, InvalidOperation, TypeError):
                return Response({'detail': 'Componente o cantidad no válidos.'}, status=status.HTTP_400_BAD_REQUEST)
            if componente.pk == producto.pk:
                return Response({'detail': 'Un combo o kit no puede contenerse a sí mismo.'}, status=status.HTTP_400_BAD_REQUEST)
            if cantidad <= 0:
                return Response({'detail': 'La cantidad de cada componente debe ser mayor que cero.'}, status=status.HTTP_400_BAD_REQUEST)
            nuevos.append((componente, cantidad))

        ComponenteProducto.objects.filter(padre=producto).delete()
        ComponenteProducto.objects.bulk_create([
            ComponenteProducto(padre=producto, componente=componente, cantidad=cantidad)
            for componente, cantidad in nuevos
        ])
        return Response(self._payload(producto))
