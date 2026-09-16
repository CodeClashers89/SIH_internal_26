from rest_framework import serializers
from .models import LogisticsPartner, DeliveryShipment, TransportOffer
from orders.serializers import OrderSerializer

class LogisticsPartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogisticsPartner
        fields = '__all__'

class DeliveryShipmentSerializer(serializers.ModelSerializer):
    partner_details = LogisticsPartnerSerializer(source='partner', read_only=True)
    order_details = OrderSerializer(source='order', read_only=True)

    class Meta:
        model = DeliveryShipment
        fields = (
            'id', 'order', 'order_details', 'partner', 'partner_details',
            'pickup_address', 'delivery_address', 'distance_km', 'status',
            'delivery_otp', 'assigned_at', 'shipped_at', 'delivered_at',
            'handover_completed_at', 'handover_confirmed_by'
        )
        read_only_fields = ('id', 'assigned_at')


class TransportOfferSerializer(serializers.ModelSerializer):
    farmer_username = serializers.ReadOnlyField(source='farmer.username')
    partner_details = LogisticsPartnerSerializer(source='partner', read_only=True)
    shipment_details = DeliveryShipmentSerializer(source='shipment', read_only=True)

    class Meta:
        model = TransportOffer
        fields = (
            'id', 'shipment', 'shipment_details', 'farmer', 'farmer_username',
            'partner', 'partner_details', 'status', 'message', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'farmer', 'farmer_username', 'status', 'created_at', 'updated_at')
