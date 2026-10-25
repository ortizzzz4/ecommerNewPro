from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from pos.seguridad import bloqueado, generar_token, limpiar_fallos, registrar_fallo
from users.permisos import normalizar_carnet

User = get_user_model()


class LoginSerializer(TokenObtainPairSerializer):
    """Acepta el nombre de usuario o el número de carnet en el campo "username"."""

    def validate(self, attrs):
        identificador = (attrs.get('username') or '').strip()
        if identificador and not User.objects.filter(username=identificador).exists():
            por_carnet = User.objects.filter(carnet=normalizar_carnet(identificador)).first()
            if por_carnet:
                attrs['username'] = por_carnet.username
        return super().validate(attrs)


class LoginPinView(APIView):
    """Ingreso rápido con carnet y PIN (pensado para cajeros en el mostrador)."""
    permission_classes = [AllowAny]

    def post(self, request):
        carnet = normalizar_carnet(request.data.get('carnet', ''))
        pin = str(request.data.get('pin', ''))
        usuario = User.objects.filter(carnet=carnet, is_active=True).first() if carnet else None
        if usuario is None or not usuario.tiene_pin():
            return Response({'detail': 'Carnet o PIN incorrectos.'}, status=status.HTTP_403_FORBIDDEN)
        if bloqueado(usuario):
            return Response(
                {'detail': 'Demasiados intentos fallidos. Espera 5 minutos.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        if not usuario.check_pin(pin):
            registrar_fallo(usuario)
            return Response({'detail': 'Carnet o PIN incorrectos.'}, status=status.HTTP_403_FORBIDDEN)

        limpiar_fallos(usuario)
        refresh = RefreshToken.for_user(usuario)
        # El PIN ya fue validado: se entrega también el token del POS para no pedirlo otra vez
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'pos_token': generar_token(usuario),
        })


class LoginCarnetView(APIView):
    """Entrada al POS escaneando el carnet (sin PIN). Solo para usuarios con acceso al punto de venta."""
    permission_classes = [AllowAny]

    def post(self, request):
        carnet = normalizar_carnet(request.data.get('carnet', ''))
        usuario = User.objects.filter(carnet=carnet, is_active=True).first() if len(carnet) == 9 else None
        if usuario is None:
            return Response({'detail': 'Carnet no registrado o inactivo.'}, status=status.HTTP_403_FORBIDDEN)
        if not usuario.has_perm('pos.use_pos'):
            return Response(
                {'detail': 'Tu usuario no tiene acceso al punto de venta.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        refresh = RefreshToken.for_user(usuario)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'pos_token': generar_token(usuario),
            'username': usuario.username,
        })
