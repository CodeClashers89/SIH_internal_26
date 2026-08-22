from rest_framework import serializers
from .models import Market, MarketPrice

class MarketPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketPrice
        fields = (
            'id', 'commodity', 'variety', 'grade', 
            'min_price', 'max_price', 'modal_price', 
            'unit', 'reported_date', 'fetched_at'
        )

class MarketSerializer(serializers.ModelSerializer):
    prices = MarketPriceSerializer(many=True, read_only=True)
    
    class Meta:
        model = Market
        fields = (
            'id', 'name', 'normalized_name', 'district', 'state', 
            'latitude', 'longitude', 'source', 'is_active', 
            'last_geocoded_at', 'prices'
        )

class MarketListSerializer(serializers.ModelSerializer):
    # A lightweight serializer for map markers
    class Meta:
        model = Market
        fields = (
            'id', 'name', 'district', 'state', 
            'latitude', 'longitude'
        )
