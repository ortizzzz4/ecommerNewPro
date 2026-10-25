from rest_framework import serializers

from .models import Resena


class ResenaSerializer(serializers.ModelSerializer):
    foto = serializers.ImageField(read_only=True, use_url=True)

    class Meta:
        model = Resena
        fields = ['id', 'nombre', 'cargo', 'empresa', 'calificacion', 'texto', 'foto']
