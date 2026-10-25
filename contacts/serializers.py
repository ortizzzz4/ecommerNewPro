from rest_framework import serializers
from .models import Contact

class ContactSerializer(serializers.ModelSerializer):
    tipo_display        = serializers.CharField(source='get_tipo_display', read_only=True)
    tipo_persona_display = serializers.CharField(source='get_tipo_persona_display', read_only=True)

    class Meta:
        model  = Contact
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class ContactListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listas y selects"""
    class Meta:
        model  = Contact
        fields = ['id', 'nombre', 'nit', 'email', 'telefono', 'tipo', 'activo']