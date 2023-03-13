from rest_framework import serializers
from .models import PromoCode,PromoCodeManager

class ListPromoCode(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields="__all__"