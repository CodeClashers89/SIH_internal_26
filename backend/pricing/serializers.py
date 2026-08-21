from rest_framework import serializers
from .models import MandiPrice

class MandiPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MandiPrice
        fields = '__all__'
