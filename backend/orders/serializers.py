from rest_framework import serializers
from .models import (
    Order, OrderItem, Subscription, SubscriptionItem,
    QuoteRequest, BulkRequirement, FarmerOffer, PreHarvestContract
)
from products.models import Product
from products.serializers import ProductSerializer
from users.serializers import UserSerializer

class OrderItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'product_details', 'quantity', 'price')

class SubscriptionItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = SubscriptionItem
        fields = ('id', 'product', 'product_details', 'quantity', 'price')

class SubscriptionSerializer(serializers.ModelSerializer):
    items = SubscriptionItemSerializer(many=True, read_only=True)
    buyer_username = serializers.ReadOnlyField(source='buyer.username')
    buyer_role = serializers.ReadOnlyField(source='buyer.role')
    farmer_names = serializers.SerializerMethodField()

    def get_farmer_names(self, obj):
        farmers = set()
        for item in obj.items.all():
            if item.product and item.product.farmer:
                farmers.add(item.product.farmer.username)
        return list(farmers)

    class Meta:
        model = Subscription
        fields = (
            'id', 'buyer', 'buyer_username', 'buyer_role', 'frequency', 'delivery_day',
            'delivery_time_slot', 'duration_months', 'total_deliveries',
            'completed_deliveries', 'start_date', 'next_delivery_date',
            'shipping_address', 'shipping_pincode', 'per_delivery_subtotal',
            'discount_percentage', 'shipping_charge', 'per_delivery_total',
            'total_plan_amount', 'status', 'items', 'farmer_names',
            'created_at', 'updated_at'
        )
        read_only_fields = (
            'id', 'buyer', 'per_delivery_subtotal', 'discount_percentage',
            'shipping_charge', 'per_delivery_total', 'total_plan_amount',
            'total_deliveries', 'completed_deliveries', 'start_date',
            'next_delivery_date', 'created_at', 'updated_at'
        )

class CreateSubscriptionSerializer(serializers.Serializer):
    items = serializers.ListField(child=serializers.DictField())
    shipping_address = serializers.CharField()
    shipping_pincode = serializers.CharField(max_length=10)
    delivery_day = serializers.CharField(default='Monday')
    delivery_time_slot = serializers.CharField(default='morning')
    duration_months = serializers.IntegerField(default=2)

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
    buyer_role = serializers.ReadOnlyField(source='buyer.role')
    channel = serializers.SerializerMethodField()
    shipment = serializers.SerializerMethodField()

    def get_channel(self, obj):
        return 'wholesale' if obj.buyer and getattr(obj.buyer, 'role', '') == 'bulk_buyer' else 'retail'

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
            'id', 'buyer', 'buyer_username', 'buyer_role', 'channel', 'subscription',
            'product_subtotal', 'shipping_charge', 'total_amount',
            'status', 'shipping_address', 'shipping_pincode',
            'payment_status', 'payment_id', 'razorpay_order_id',
            'cancellation_locked', 'cancellation_locked_at', 'cancellation_reason',
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
        return value

class QuoteRequestSerializer(serializers.ModelSerializer):
    buyer_details = UserSerializer(source='buyer', read_only=True)
    buyer_username = serializers.ReadOnlyField(source='buyer.username')
    product_details = ProductSerializer(source='product', read_only=True)
    order_id = serializers.SerializerMethodField()
    order_status = serializers.SerializerMethodField()
    order_payment_status = serializers.SerializerMethodField()

    def get_order_id(self, obj):
        if obj.order_id:
            return obj.order_id
        order = Order.objects.filter(items__product=obj.product, buyer=obj.buyer).order_by('-created_at').first()
        return order.id if order else None

    def get_order_status(self, obj):
        order = obj.order or Order.objects.filter(items__product=obj.product, buyer=obj.buyer).order_by('-created_at').first()
        return order.status if order else None

    def get_order_payment_status(self, obj):
        order = obj.order or Order.objects.filter(items__product=obj.product, buyer=obj.buyer).order_by('-created_at').first()
        return order.payment_status if order else None

    class Meta:
        model = QuoteRequest
        fields = (
            'id', 'buyer', 'buyer_username', 'buyer_details', 'product', 'product_details', 
            'quantity', 'target_price', 'offered_price', 'status', 'order', 'order_id',
            'order_status', 'order_payment_status', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'buyer', 'created_at', 'updated_at')

class FarmerOfferSerializer(serializers.ModelSerializer):
    farmer_username = serializers.ReadOnlyField(source='farmer.username')
    order_id = serializers.SerializerMethodField()
    order_status = serializers.SerializerMethodField()

    def get_order_id(self, obj):
        if obj.order_id:
            return obj.order_id
        order = Order.objects.filter(items__product__farmer=obj.farmer, buyer=obj.requirement.buyer).order_by('-created_at').first()
        return order.id if order else None

    def get_order_status(self, obj):
        order = obj.order or Order.objects.filter(items__product__farmer=obj.farmer, buyer=obj.requirement.buyer).order_by('-created_at').first()
        return order.status if order else None

    class Meta:
        model = FarmerOffer
        fields = ('id', 'requirement', 'farmer', 'farmer_username', 'quantity', 'price_per_unit', 'delivery_date', 'notes', 'status', 'order', 'order_id', 'order_status', 'created_at')
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
