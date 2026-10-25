from decimal import Decimal

from django.db.models import Count, Sum
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from users.permisos import PermisoPorModelo

from .models import Actividad, Oportunidad

ETAPAS_ABIERTAS = ['nueva', 'contactada', 'propuesta']


class OportunidadSerializer(serializers.ModelSerializer):
    contacto_nombre = serializers.CharField(source='contacto.nombre', read_only=True, default=None)
    cliente = serializers.CharField(source='cliente_nombre', read_only=True)
    responsable_nombre = serializers.CharField(source='responsable.username', read_only=True, default=None)

    class Meta:
        model = Oportunidad
        fields = ['id', 'titulo', 'contacto', 'contacto_nombre', 'nombre_prospecto', 'cliente', 'correo', 'telefono',
                  'etapa', 'valor', 'responsable', 'responsable_nombre', 'fecha_cierre', 'notas', 'creada']
        extra_kwargs = {'responsable': {'required': False}}


class ActividadSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.username', read_only=True, default=None)

    class Meta:
        model = Actividad
        fields = ['id', 'oportunidad', 'tipo', 'descripcion', 'usuario_nombre', 'fecha']
        read_only_fields = ['fecha']


class OportunidadViewSet(viewsets.ModelViewSet):
    serializer_class = OportunidadSerializer
    queryset = Oportunidad.objects.select_related('contacto', 'responsable')
    permission_classes = [PermisoPorModelo]

    def get_queryset(self):
        queryset = super().get_queryset()
        etapa = self.request.query_params.get('etapa')
        if etapa:
            queryset = queryset.filter(etapa=etapa)
        return queryset

    def perform_create(self, serializer):
        # Si no se indica responsable, queda a cargo de quien la registra
        serializer.save(responsable=serializer.validated_data.get('responsable') or self.request.user)

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Cantidad y valor de oportunidades por etapa, y el valor abierto (pendiente de cerrar)."""
        por_etapa = {fila['etapa']: fila for fila in Oportunidad.objects.values('etapa').annotate(
            cantidad=Count('id'), valor=Sum('valor'))}
        etapas = [{
            'etapa': codigo,
            'etiqueta': etiqueta,
            'cantidad': por_etapa.get(codigo, {}).get('cantidad', 0),
            'valor': f"{por_etapa.get(codigo, {}).get('valor') or Decimal('0'):.2f}",
        } for codigo, etiqueta in Oportunidad.ETAPAS]
        abierto = Oportunidad.objects.filter(etapa__in=ETAPAS_ABIERTAS).aggregate(total=Sum('valor'))['total']
        return Response({'etapas': etapas, 'valor_abierto': f"{abierto or Decimal('0'):.2f}"})


class ActividadViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = ActividadSerializer
    queryset = Actividad.objects.select_related('usuario')
    permission_classes = [PermisoPorModelo]

    def get_queryset(self):
        queryset = super().get_queryset()
        oportunidad = self.request.query_params.get('oportunidad')
        if oportunidad:
            queryset = queryset.filter(oportunidad_id=oportunidad)
        return queryset

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)
