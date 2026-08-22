from rest_framework import serializers
from .models import ControlTowerException, OperationalEvent, SLADefinition

class ControlTowerExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ControlTowerException
        fields = '__all__'

class OperationalEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = OperationalEvent
        fields = '__all__'
