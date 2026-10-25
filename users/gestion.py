from django.contrib.auth.models import Group, Permission
from django.shortcuts import get_object_or_404
from rest_framework import serializers, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .permisos import PermisoPorModelo, normalizar_carnet, pin_valido
from tenants.cuentas import cuenta_por_usuario, reflejar_desde_empresa, revocar

# Apps internas de Django que no se muestran al armar roles
APPS_OCULTAS = ['admin', 'contenttypes', 'sessions']


def codigo_permiso(permiso):
    return f'{permiso.content_type.app_label}.{permiso.codename}'


def puede_otorgar(user, permisos):
    """Un usuario solo puede dar permisos que él mismo tiene (los superusuarios pueden todo)."""
    if user.is_superuser:
        return True
    propios = user.get_all_permissions()
    return all(codigo_permiso(p) in propios for p in permisos)


class PermisoSerializer(serializers.ModelSerializer):
    codigo = serializers.SerializerMethodField()
    app = serializers.CharField(source='content_type.app_label', read_only=True)

    class Meta:
        model = Permission
        fields = ['id', 'codigo', 'nombre', 'app']

    def get_codigo(self, obj):
        return codigo_permiso(obj)


class RolSerializer(serializers.ModelSerializer):
    permissions = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Permission.objects.select_related('content_type'), required=False
    )

    class Meta:
        model = Group
        fields = ['id', 'name', 'permissions']

    def validate_permissions(self, permisos):
        if not puede_otorgar(self.context['request'].user, permisos):
            raise serializers.ValidationError('No puedes otorgar permisos que tú no tienes.')
        return permisos


class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    groups = serializers.PrimaryKeyRelatedField(many=True, queryset=Group.objects.all(), required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'carnet', 'groups', 'password']

    def validate_carnet(self, valor):
        valor = normalizar_carnet(valor)
        return valor or None

    def validate(self, data):
        if self.instance is None and not data.get('password'):
            raise serializers.ValidationError({'password': 'La contraseña es obligatoria (mínimo 8 caracteres).'})
        return data

    def validate_groups(self, roles):
        permisos = Permission.objects.filter(group__in=roles).select_related('content_type')
        if not puede_otorgar(self.context['request'].user, permisos):
            raise serializers.ValidationError('Este rol tiene permisos que tú no puedes otorgar.')
        return roles

    def create(self, validated_data):
        password = validated_data.pop('password')
        roles = validated_data.pop('groups', [])
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        user.groups.set(roles)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        roles = validated_data.pop('groups', None)
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        if password:
            instance.set_password(password)
        instance.save()
        if roles is not None:
            instance.groups.set(roles)
        return instance


class UsuarioViewSet(viewsets.ModelViewSet):
    serializer_class = UsuarioSerializer
    queryset = User.objects.prefetch_related('groups').order_by('username')
    permission_classes = [PermisoPorModelo]

    def _proteger_superusuario(self, instance):
        if instance.is_superuser and not self.request.user.is_superuser:
            raise PermissionDenied('Solo un superusuario puede modificar a otro superusuario.')

    # Los usuarios de la empresa se guardan en la cuenta (la base de la cuenta) y se les da acceso a esta empresa.

    def perform_create(self, serializer):
        empresa = getattr(self.request, 'empresa', None)
        username = serializer.validated_data.get('username')
        if empresa is not None and cuenta_por_usuario(empresa.db_name, username) is not None:
            raise ValidationError({'username': 'Ese usuario ya existe en tu cuenta. Dale acceso desde Mis empresas.'})
        usuario = serializer.save()
        if empresa is not None:
            reflejar_desde_empresa(usuario, empresa)

    def perform_update(self, serializer):
        self._proteger_superusuario(serializer.instance)
        if 'password' in serializer.validated_data and not self.request.user.is_superuser:
            raise PermissionDenied('Solo el administrador puede cambiar la contraseña de otro usuario.')
        usuario = serializer.save()
        empresa = getattr(self.request, 'empresa', None)
        if empresa is not None:
            reflejar_desde_empresa(usuario, empresa)

    def perform_destroy(self, instance):
        if instance == self.request.user:
            raise PermissionDenied('No puedes eliminar tu propia cuenta.')
        self._proteger_superusuario(instance)
        empresa = getattr(self.request, 'empresa', None)
        if empresa is not None:
            cuenta = cuenta_por_usuario(empresa.db_name, instance.username)
            if cuenta is not None:
                revocar(cuenta, empresa)
        instance.delete()


class RolViewSet(viewsets.ModelViewSet):
    serializer_class = RolSerializer
    queryset = Group.objects.prefetch_related('permissions').order_by('name')
    permission_classes = [PermisoPorModelo]


class PermisosDisponiblesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permisos = (
            Permission.objects.select_related('content_type')
            .exclude(content_type__app_label__in=APPS_OCULTAS)
            .order_by('content_type__app_label', 'codename')
        )
        return Response(PermisoSerializer(permisos, many=True).data)


class MiUsuarioView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'is_superuser': user.is_superuser,
            'roles': [g.name for g in user.groups.all()],
            'tiene_pin': user.tiene_pin(),
            'permisos': sorted(user.get_all_permissions()),
        })


class MiPinView(APIView):
    """El usuario cambia su propio PIN. Si ya tiene uno, debe indicar el actual."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.tiene_pin() and not user.check_pin(str(request.data.get('pin_actual', ''))):
            return Response({'detail': 'El PIN actual no es correcto.'}, status=400)
        nuevo = str(request.data.get('pin_nuevo', ''))
        if not pin_valido(nuevo):
            return Response({'detail': 'El PIN debe tener entre 4 y 6 dígitos.'}, status=400)
        user.set_pin(nuevo)
        user.save(update_fields=['pin_hash'])
        return Response({'ok': True})


class PinUsuarioView(APIView):
    """Un administrador asigna o restablece el PIN de otro usuario."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not request.user.has_perm('users.change_user'):
            raise PermissionDenied('No tienes permiso para cambiar usuarios.')
        objetivo = get_object_or_404(User, pk=pk)
        if objetivo.is_superuser and not request.user.is_superuser:
            raise PermissionDenied('Solo un superusuario puede cambiar el PIN de otro superusuario.')
        nuevo = str(request.data.get('pin_nuevo', ''))
        if not pin_valido(nuevo):
            return Response({'detail': 'El PIN debe tener entre 4 y 6 dígitos.'}, status=400)
        objetivo.set_pin(nuevo)
        objetivo.save(update_fields=['pin_hash'])
        return Response({'ok': True})
