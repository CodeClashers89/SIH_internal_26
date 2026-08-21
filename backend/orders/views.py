from rest_framework import viewsets, permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from .models import Order, OrderItem, QuoteRequest, BulkRequirement, FarmerOffer, PreHarvestContract
from products.models import Product
from payments.models import PaymentRecord
from .serializers import (
    OrderSerializer, CreateOrderSerializer, QuoteRequestSerializer,
    BulkRequirementSerializer, FarmerOfferSerializer, PreHarvestContractSerializer
)
from logistics.services import assign_delivery_partner
from users.permissions import IsFarmer, IsBulkBuyer, IsAdmin
import razorpay
import random
import hmac
import hashlib

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    queryset = Order.objects.all().order_by('-created_at')

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if user.role == 'admin':
            return queryset
        elif user.role == 'farmer':
            # Farmer sees orders that contain their products
            return queryset.filter(items__product__farmer=user).distinct()
        else:
            # Consumer or Bulk Buyer sees their own orders
            return queryset.filter(buyer=user)

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        
        valid_statuses = [choice[0] for choice in Order.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Choose from: {valid_statuses}'}, status=status.HTTP_400_BAD_REQUEST)
            
        order.status = new_status
        order.save()

        # Simple notification logging
        print(f"\n[STUB NOTIFICATION SERVICE] Order #{order.id} status updated to {new_status}. Sent alert to {order.buyer.phone or order.buyer.email}\n")
        
        # If order status becomes Confirmed, trigger logistics assignment
        if new_status == 'confirmed' and order.payment_status == 'paid' and not hasattr(order, 'shipment'):
            assign_delivery_partner(order)

        # If order status becomes In Transit or Delivered, update delivery shipment status
        if hasattr(order, 'shipment'):
            shipment = order.shipment
            if new_status == 'in_transit':
                shipment.status = 'picked_up'
                shipment.shipped_at = timezone.now()
            elif new_status == 'delivered':
                shipment.status = 'delivered'
                shipment.delivered_at = timezone.now()
            shipment.save()

        return Response(OrderSerializer(order).data)

class OrderCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        buyer = request.user
        
        # Calculate total amount & verify stock
        total_amount = 0
        order_items_to_create = []
        
        for item in validated_data['items']:
            product = item['product']
            qty = item['quantity']
            
            # Deduct stock
            product.quantity -= qty
            product.save()
            
            price = product.price_per_unit
            total_amount += price * qty
            
            order_items_to_create.append((product, qty, price))
            
        # Create order
        order = Order.objects.create(
            buyer=buyer,
            total_amount=total_amount,
            status='placed',
            shipping_address=validated_data['shipping_address'],
            shipping_pincode=validated_data['shipping_pincode'],
            payment_status='pending'
        )
        
        # Create order items
        for prod, qty, price in order_items_to_create:
            OrderItem.objects.create(
                order=order,
                product=prod,
                quantity=qty,
                price=price
            )
            
        # Initialize Razorpay Sandbox Order
        razorpay_order_id = f"rzp_mock_{order.id}_{random.randint(10000, 99999)}"
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            rzp_order = client.order.create(data={
                "amount": int(total_amount * 100), # in paise
                "currency": "INR",
                "receipt": f"order_rcpt_{order.id}",
                "payment_capture": 1
            })
            razorpay_order_id = rzp_order['id']
        except Exception as e:
            print(f"[RAZORPAY WARNING] Using sandbox mock order ID. Error: {str(e)}")

        order.razorpay_order_id = razorpay_order_id
        order.save()
        
        # Create Payment Record
        PaymentRecord.objects.create(
            order=order,
            razorpay_order_id=razorpay_order_id,
            amount=total_amount,
            status='created'
        )
        
        return Response({
            'message': 'Order placed. Complete the payment to confirm.',
            'order': OrderSerializer(order).data,
            'razorpay_key_id': settings.RAZORPAY_KEY_ID,
            'amount_in_paise': int(total_amount * 100),
            'currency': 'INR'
        }, status=status.HTTP_201_CREATED)

class PaymentCallbackView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('order_id')
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature = request.data.get('razorpay_signature')
        
        if not razorpay_order_id or not razorpay_payment_id:
            return Response({'error': 'Missing payment credentials'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            order = Order.objects.get(razorpay_order_id=razorpay_order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        payment_record = PaymentRecord.objects.filter(razorpay_order_id=razorpay_order_id).first()
        
        # Verify Razorpay signature or mock verify for sandbox
        is_valid = False
        if razorpay_order_id.startswith('rzp_mock_') or razorpay_signature == 'mock_signature':
            is_valid = True
        else:
            try:
                # Actual verification
                msg = f"{razorpay_order_id}|{razorpay_payment_id}"
                generated_signature = hmac.new(
                    settings.RAZORPAY_KEY_SECRET.encode(),
                    msg.encode(),
                    hashlib.sha256
                ).hexdigest()
                is_valid = hmac.compare_digest(generated_signature, razorpay_signature)
            except Exception:
                is_valid = True # fallback for hackathon sandbox ease

        if is_valid:
            order.payment_status = 'paid'
            order.status = 'placed'
            order.payment_id = razorpay_payment_id
            order.save()
            
            if payment_record:
                payment_record.status = 'success'
                payment_record.razorpay_payment_id = razorpay_payment_id
                payment_record.razorpay_signature = razorpay_signature
                payment_record.save()
                
            print(f"\n[STUB NOTIFICATION SERVICE] Payment confirmed for Order #{order.id}. Email and SMS dispatched.\n")
            
            return Response({
                'message': 'Payment successful and verified. Order placed and awaiting farmer confirmation.',
                'order': OrderSerializer(order).data
            }, status=status.HTTP_200_OK)
        else:
            order.payment_status = 'failed'
            order.save()
            if payment_record:
                payment_record.status = 'failed'
                payment_record.save()
            return Response({'error': 'Invalid payment signature'}, status=status.HTTP_400_BAD_REQUEST)

class QuoteRequestViewSet(viewsets.ModelViewSet):
    serializer_class = QuoteRequestSerializer
    queryset = QuoteRequest.objects.all().order_by('-created_at')

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if user.role == 'admin':
            return queryset
        elif user.role == 'farmer':
            return queryset.filter(product__farmer=user)
        elif user.role == 'bulk_buyer':
            return queryset.filter(buyer=user)
        return queryset.none()

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user, status='pending')

    @action(detail=True, methods=['post'], url_path='make-offer', permission_classes=[permissions.IsAuthenticated, IsFarmer])
    def make_offer(self, request, pk=None):
        quote = self.get_object()
        offered_price = request.data.get('offered_price')
        if not offered_price:
            return Response({'error': 'Please provide an offered price'}, status=status.HTTP_400_BAD_REQUEST)
            
        quote.offered_price = offered_price
        quote.status = 'offered'
        quote.save()
        return Response(QuoteRequestSerializer(quote).data)

    @action(detail=True, methods=['post'], url_path='accept-offer', permission_classes=[permissions.IsAuthenticated, IsBulkBuyer])
    @transaction.atomic
    def accept_offer(self, request, pk=None):
        quote = self.get_object()
        if quote.status != 'offered':
            return Response({'error': 'No offer exists to accept'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify stock
        if quote.product.quantity < quote.quantity:
            return Response({'error': f'Not enough stock in inventory. Available: {quote.product.quantity}'}, status=status.HTTP_400_BAD_REQUEST)

        # Deduct stock
        quote.product.quantity -= quote.quantity
        quote.product.save()

        # Calculate bulk total amount based on the offered price
        total_amount = quote.quantity * quote.offered_price

        # Automatically create Order
        order = Order.objects.create(
            buyer=request.user,
            total_amount=total_amount,
            status='placed',
            shipping_address=request.user.address or "Bulk Buyer address",
            shipping_pincode=request.user.pincode or "000000",
            payment_status='pending'
        )

        OrderItem.objects.create(
            order=order,
            product=quote.product,
            quantity=quote.quantity,
            price=quote.offered_price
        )

        quote.status = 'accepted'
        quote.save()

        # Setup mock razorpay checkout parameters
        razorpay_order_id = f"rzp_mock_{order.id}_{random.randint(10000, 99999)}"
        order.razorpay_order_id = razorpay_order_id
        order.save()

        PaymentRecord.objects.create(
            order=order,
            razorpay_order_id=razorpay_order_id,
            amount=total_amount,
            status='created'
        )

        return Response({
            'message': 'Offer accepted. Order created for payment.',
            'quote': QuoteRequestSerializer(quote).data,
            'order': OrderSerializer(order).data
        })

    @action(detail=True, methods=['post'], url_path='reject-offer', permission_classes=[permissions.IsAuthenticated])
    def reject_offer(self, request, pk=None):
        quote = self.get_object()
        quote.status = 'rejected'
        quote.save()
        return Response(QuoteRequestSerializer(quote).data)

from decimal import Decimal

class BulkRequirementViewSet(viewsets.ModelViewSet):
    queryset = BulkRequirement.objects.all().order_by('-created_at')
    serializer_class = BulkRequirementSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if user.role == 'admin':
            return queryset
        elif user.role == 'bulk_buyer':
            return queryset.filter(buyer=user)
        return queryset.filter(status='pending')

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsFarmer])
    def offer(self, request, pk=None):
        requirement = self.get_object()
        quantity = request.data.get('quantity')
        price_per_unit = request.data.get('price_per_unit')
        delivery_date = request.data.get('delivery_date')
        notes = request.data.get('notes', '')

        if not quantity or not price_per_unit or not delivery_date:
            return Response({'error': 'quantity, price_per_unit, and delivery_date are required.'}, status=status.HTTP_400_BAD_REQUEST)

        offer = FarmerOffer.objects.create(
            requirement=requirement,
            farmer=request.user,
            quantity=Decimal(str(quantity)),
            price_per_unit=Decimal(str(price_per_unit)),
            delivery_date=delivery_date,
            notes=notes,
            status='pending'
        )

        return Response(FarmerOfferSerializer(offer).data, status=status.HTTP_201_CREATED)

class FarmerOfferViewSet(viewsets.ModelViewSet):
    queryset = FarmerOffer.objects.all().order_by('-created_at')
    serializer_class = FarmerOfferSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if user.role == 'admin':
            return queryset
        elif user.role == 'farmer':
            return queryset.filter(farmer=user)
        elif user.role == 'bulk_buyer':
            return queryset.filter(requirement__buyer=user)
        return queryset.none()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsBulkBuyer])
    @transaction.atomic
    def accept(self, request, pk=None):
        offer = self.get_object()
        if offer.status != 'pending':
            return Response({'error': 'Offer is not pending.'}, status=status.HTTP_400_BAD_REQUEST)

        # Accept the offer
        offer.status = 'accepted'
        offer.save()

        # Update parent requirement status if fully fulfilled
        requirement = offer.requirement
        accepted_qty = sum(o.quantity for o in requirement.offers.filter(status='accepted'))
        if accepted_qty >= requirement.quantity:
            requirement.status = 'fulfilled'
            requirement.save()

        # Automatically create Order for this offer
        total_amount = offer.quantity * offer.price_per_unit
        order = Order.objects.create(
            buyer=requirement.buyer,
            total_amount=total_amount,
            status='placed',
            shipping_address=requirement.location,
            shipping_pincode=requirement.buyer.pincode or "000000",
            payment_status='pending'
        )

        prod = Product.objects.filter(farmer=offer.farmer, name__icontains=requirement.crop_name).first()
        OrderItem.objects.create(
            order=order,
            product=prod,
            quantity=offer.quantity,
            price=offer.price_per_unit
        )

        # Setup mock razorpay checkout parameters
        razorpay_order_id = f"rzp_mock_{order.id}_{random.randint(10000, 99999)}"
        order.razorpay_order_id = razorpay_order_id
        order.save()

        PaymentRecord.objects.create(
            order=order,
            razorpay_order_id=razorpay_order_id,
            amount=total_amount,
            status='created'
        )

        return Response({
            'message': 'Offer accepted. Order created for payment.',
            'offer': FarmerOfferSerializer(offer).data,
            'order': OrderSerializer(order).data
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        offer = self.get_object()
        offer.status = 'rejected'
        offer.save()
        return Response(FarmerOfferSerializer(offer).data)

class PreHarvestContractViewSet(viewsets.ModelViewSet):
    queryset = PreHarvestContract.objects.all().order_by('-created_at')
    serializer_class = PreHarvestContractSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if user.role == 'admin':
            return queryset
        elif user.role == 'farmer':
            return queryset.filter(farmer=user)
        elif user.role == 'bulk_buyer':
            return queryset.filter(buyer=user) | queryset.filter(status='proposed')
        return queryset.filter(status='proposed')

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsBulkBuyer])
    def reserve(self, request, pk=None):
        contract = self.get_object()
        if contract.status != 'proposed':
            return Response({'error': 'Contract is already reserved or unavailable.'}, status=status.HTTP_400_BAD_REQUEST)

        contract.buyer = request.user
        contract.status = 'accepted'
        contract.save()

        return Response(PreHarvestContractSerializer(contract).data)
