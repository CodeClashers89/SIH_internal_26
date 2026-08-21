from rest_framework import serializers
from .models import Product, Auction, Bid, GroupOrder, GroupOrderParticipant, FlashSale, TraceabilityLot
from users.serializers import UserSerializer

class ProductSerializer(serializers.ModelSerializer):
    farmer_details = UserSerializer(source='farmer', read_only=True)
    freshness_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = (
            'id', 'farmer', 'farmer_details', 'name', 'category', 
            'quantity', 'unit', 'price_per_unit', 'harvest_date', 
            'expiry_date', 'description', 'image_url', 
            'freshness_percentage', 'created_at'
        )
        read_only_fields = ('id', 'farmer', 'created_at', 'freshness_percentage')

    def validate(self, data):
        if data.get('harvest_date') and data.get('expiry_date'):
            if data['harvest_date'] > data['expiry_date']:
                raise serializers.ValidationError("Expiry date must be after harvest date.")
        return data

class BidSerializer(serializers.ModelSerializer):
    buyer_username = serializers.ReadOnlyField(source='buyer.username')

    class Meta:
        model = Bid
        fields = ('id', 'auction', 'buyer', 'buyer_username', 'bid_amount', 'created_at')
        read_only_fields = ('id', 'buyer', 'buyer_username', 'created_at')

class AuctionSerializer(serializers.ModelSerializer):
    farmer_username = serializers.ReadOnlyField(source='farmer.username')
    bids = BidSerializer(many=True, read_only=True)

    class Meta:
        model = Auction
        fields = (
            'id', 'farmer', 'farmer_username', 'product_name', 'quantity', 
            'unit', 'starting_price', 'highest_bid', 'end_time', 'status', 
            'bids', 'created_at'
        )
        read_only_fields = ('id', 'farmer', 'farmer_username', 'highest_bid', 'created_at')

class GroupOrderParticipantSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = GroupOrderParticipant
        fields = ('id', 'group_order', 'user', 'username', 'quantity', 'paid', 'created_at')
        read_only_fields = ('id', 'user', 'username', 'created_at')

class GroupOrderSerializer(serializers.ModelSerializer):
    creator_username = serializers.ReadOnlyField(source='creator.username')
    participants = GroupOrderParticipantSerializer(many=True, read_only=True)

    class Meta:
        model = GroupOrder
        fields = (
            'id', 'creator', 'creator_username', 'product_name', 'target_quantity', 
            'current_quantity', 'unit', 'group_price', 'deadline', 'location', 
            'status', 'participants', 'created_at'
        )
        read_only_fields = ('id', 'creator', 'creator_username', 'current_quantity', 'created_at')

class FlashSaleSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = FlashSale
        fields = ('id', 'product', 'product_details', 'original_price', 'discount_price', 'end_time', 'created_at')
        read_only_fields = ('id', 'created_at')

class TraceabilityLotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TraceabilityLot
        fields = (
            'id', 'lot_id', 'product', 'farmer_name', 'farm_location', 
            'harvest_date', 'package_date', 'grade', 'logistics_partner', 
            'buyer_name', 'created_at'
        )
        read_only_fields = ('id', 'created_at')
