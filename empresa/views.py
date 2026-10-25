from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permisos import PermisoPorModelo

from .correo import CorreoError, enviar
from .models import Empresa
from .serializers import EmpresaSerializer


class EmpresaView(APIView):
    """GET: cualquiera con permiso de ver la empresa. PUT/PATCH: quien pueda cambiarla."""
    permission_classes = [PermisoPorModelo]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_queryset(self):
        return Empresa.objects.all()

    def get(self, request):
        return Response(EmpresaSerializer(Empresa.obtener()).data)

    def _guardar(self, request, parcial):
        empresa = Empresa.obtener()
        serializer = EmpresaSerializer(empresa, data=request.data, partial=parcial)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        datos = dict(serializer.data)
        if serializer.resultado_demo:
            datos['resultado_demo'] = serializer.resultado_demo
        return Response(datos)

    def put(self, request):
        return self._guardar(request, parcial=False)

    def patch(self, request):
        return self._guardar(request, parcial=True)


class CorreoPruebaView(APIView):
    """Envía un correo de prueba con la configuración de correo de esta empresa."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not (user.is_superuser or user.has_perm('empresa.change_empresa')):
            return Response({'detail': 'No tienes permiso para cambiar la configuración de la empresa.'},
                            status=status.HTTP_403_FORBIDDEN)
        destinatario = str(request.data.get('destinatario', '')).strip()
        if not destinatario:
            return Response({'detail': 'Indica el correo que recibirá la prueba.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            enviar(
                'Prueba de configuración de correo',
                'Si recibes este mensaje, el correo de la empresa está configurado correctamente.',
                [destinatario],
                empresa=Empresa.obtener(),
            )
        except CorreoError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'detail': f'Correo de prueba enviado a {destinatario}.'})
