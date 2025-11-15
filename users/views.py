from django.shortcuts import render
from rest_framework import viewsets
from .models import User
from .serializers import UserSerializer
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny,IsAuthenticated,IsAdminUser
from rest_framework.response import Response
from rest_framework import status


from rest_framework.generics import GenericAPIView

class RegisterView(GenericAPIView):
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Usuario registrado correctamente'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UsersAPi(viewsets.ModelViewSet):
      serializer_class = UserSerializer
      queryset = User.objects.all()
      
      
class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        })