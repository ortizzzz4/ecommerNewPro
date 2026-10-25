from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permisos import PermisoPorModelo

from .fe import FEError, construir_dte, transmitir
from .models import Invoice


class DteView(APIView):
    permission_classes = [PermisoPorModelo]

    def get_queryset(self):
        return Invoice.objects.all()

    def get(self, request, pk):
        factura = get_object_or_404(Invoice, pk=pk)
        try:
            return Response(construir_dte(factura))
        except FEError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class TransmitirView(APIView):
    permission_classes = [PermisoPorModelo]

    def get_queryset(self):
        return Invoice.objects.all()

    def post(self, request, pk):
        factura = get_object_or_404(Invoice, pk=pk)
        try:
            transmitir(factura)
        except FEError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        return Response({'detail': 'Transmitida.'})
