from rest_framework import serializers
from .models import Order, OrderItem, QuoteRequest, BulkRequirement, FarmerOffer, PreHarvestContract
from products.models import Product
from products.serializers import ProductSerializer
from users.serializers import UserSerializer

class OrderItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'product_details', 'quantity', 'price')

class ShipmentSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    partner = serializers.PrimaryKeyRelatedField(read_only=True)
    partner_details = serializers.SerializerMethodField()
    pickup_address = serializers.CharField(read_only=True)
    delivery_address = serializers.CharField(read_only=True)
    distance_km = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    status = serializers.CharField(read_only=True)
    delivery_otp = serializers.CharField(read_only=True)
    assigned_at = serializers.DateTimeField(read_only=True)
    shipped_at = serializers.DateTimeField(read_only=True)
    delivered_at = serializers.DateTimeField(read_only=True)

    def get_partner_details(self, obj):
        if obj.partner:
            return {
                'id': obj.partner.id,
                'name': obj.partner.name,
                'phone': obj.partner.phone,
                'district': obj.partner.district,
                'user': obj.partner.user_id,
            }
        return None

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    buyer_username = serializers.ReadOnlyField(source='buyer.username')
    shipment = serializers.SerializerMethodField()

    def get_shipment(self, obj):
        try:
            if hasattr(obj, 'shipment') and obj.shipment:
                return ShipmentSummarySerializer(obj.shipment).data
            return None
        except Exception:
            return None

    class Meta:
        model = Order
        fields = (
            'id', 'buyer', 'buyer_username',
            'product_subtotal', 'shipping_charge', 'total_amount',
            'status', 'shipping_address', 'shipping_pincode',
            'payment_status', 'payment_id', 'razorpay_order_id',
            'items', 'shipment', 'created_at', 'updated_at'
        )
        read_only_fields = (
            'id', 'buyer', 'product_subtotal', 'shipping_charge', 'total_amount',
            'payment_status', 'razorpay_order_id', 'created_at', 'updated_at'
        )

class CreateOrderItemSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2)

class CreateOrderSerializer(serializers.Serializer):
    items = CreateOrderItemSerializer(many=True)
    shipping_address = serializers.CharField()
    shipping_pincode = serializers.CharField(max_length=10)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Order must have at least one product.")
        
        for item in value:
            product = item['product']
            quantity = item['quantity']
            if quantity <= 0:
                raise serializers.ValidationError(f"Quantity for {product.name} must be greater than zero.")
            if product.quantity < quantity:
                raise serializers.ValidationError(f"Not enough stock for {product.name}. Available: {product.quantity} {product.unit}.")
        return value

class QuoteRequestSerializer(serializers.ModelSerializer):
    buyer_details = UserSerializer(source='buyer', read_only=True)
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = QuoteRequest
        fields = (
            'id', 'buyer', 'buyer_details', 'product', 'product_details', 
            'quantity', 'target_price', 'offered_price', 'status', 
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'buyer', 'created_at', 'updated_at')

class FarmerOfferSerializer(serializers.ModelSerializer):
    farmer_username = serializers.ReadOnlyField(source='farmer.username')

    class Meta:
        model = FarmerOffer
        fields = ('id', 'requirement', 'farmer', 'farmer_username', 'quantity', 'price_per_unit', 'delivery_date', 'notes', 'status', 'created_at')
        read_only_fields = ('id', 'farmer', 'farmer_username', 'created_at')

class BulkRequirementSerializer(serializers.ModelSerializer):
    buyer_username = serializers.ReadOnlyField(source='buyer.username')
    offers = FarmerOfferSerializer(many=True, read_only=True)

    class Meta:
        model = BulkRequirement
        fields = (
            'id', 'buyer', 'buyer_username', 'crop_name', 'variety', 'quantity', 
            'unit', 'grade', 'required_date', 'target_price_min', 'target_price_max', 
            'location', 'status', 'offers', 'created_at'
        )
        read_only_fields = ('id', 'buyer', 'buyer_username', 'created_at')

class PreHarvestContractSerializer(serializers.ModelSerializer):
    farmer_username = serializers.ReadOnlyField(source='farmer.username')
    buyer_username = serializers.ReadOnlyField(source='buyer.username', default='')

    class Meta:
        model = PreHarvestContract
        fields = (
            'id', 'farmer', 'farmer_username', 'buyer', 'buyer_username', 'crop_name', 
            'expected_harvest_date', 'expected_quantity', 'unit', 'contract_price', 
            'status', 'created_at'
        )
        read_only_fields = ('id', 'farmer', 'farmer_username', 'created_at')
