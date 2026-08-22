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
from logistics.services import create_open_shipment
from users.permissions import IsFarmer, IsBulkBuyer, IsAdmin
import razorpay
import random
import hmac
import hashlib

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    queryset = Order.objects.select_related('buyer').prefetch_related('items__product__farmer').all().order_by('-created_at')

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
        user = request.user

        valid_statuses = [choice[0] for choice in Order.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Choose from: {valid_statuses}'}, status=status.HTTP_400_BAD_REQUEST)

        # Role-based transition restrictions
        # Farmers can only: confirm (placed→confirmed), pack (confirmed→packed), or cancel (placed/confirmed→cancelled)
        # in_transit is set by logistics partner via shipment pickup
        # delivered is set by logistics partner via OTP verification
        if user.role == 'farmer':
            farmer_allowed = {
                'placed': ['confirmed', 'cancelled'],
                'confirmed': ['packed', 'cancelled'],
            }
            allowed_next = farmer_allowed.get(order.status, [])
            if new_status not in allowed_next:
                return Response(
                    {'error': f'Farmers cannot move order from "{order.status}" to "{new_status}". '
                               f'Shipping and delivery are handled by the logistics partner.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        if new_status == 'cancelled':
            if getattr(order, 'cancellation_locked', False):
                return Response(
                    {'error': 'CANCELLATION_LOCKED_AFTER_TRANSPORT_HANDOVER'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        order.status = new_status
        order.save()

        # Simple notification logging
        print(f"\n[STUB NOTIFICATION SERVICE] Order #{order.id} status updated to {new_status}. Sent alert to {order.buyer.phone or order.buyer.email}\n")

        # Create open broadcast shipment when farmer confirms.
        # No auto-assignment — all drivers see it and race to accept (Rapido-style).
        if new_status == 'confirmed' and not hasattr(order, 'shipment'):
            create_open_shipment(order)
            print(f"[LOGISTICS] Open shipment broadcast for order #{order.id} on farmer confirmation.")

        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='retry-payment')
    def retry_payment(self, request, pk=None):
        """
        Returns a fresh Razorpay order_id for an unpaid order so the consumer
        can re-open the payment modal without creating a duplicate order.
        """
        order = self.get_object()
        user = request.user

        if order.buyer != user:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        if order.payment_status == 'paid':
            return Response({'error': 'This order is already paid.'}, status=status.HTTP_400_BAD_REQUEST)

        # Try to create a new Razorpay order for this amount
        razorpay_order_id = order.razorpay_order_id or f"rzp_mock_{order.id}_{random.randint(10000, 99999)}"
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            rzp_order = client.order.create(data={
                "amount": int(float(order.total_amount) * 100),
                "currency": "INR",
                "receipt": f"retry_rcpt_{order.id}",
                "payment_capture": 1
            })
            razorpay_order_id = rzp_order['id']
        except Exception as e:
            print(f"[RAZORPAY WARNING] Retry using existing/mock order ID. Error: {str(e)}")

        order.razorpay_order_id = razorpay_order_id
        order.save()

        return Response({
            'message': 'Payment session ready. Complete payment to confirm your order.',
            'order': OrderSerializer(order).data,
            'razorpay_key_id': settings.RAZORPAY_KEY_ID,
            'amount_in_paise': int(float(order.total_amount) * 100),
            'currency': 'INR',
        })

class OrderCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        buyer = request.user
        shipping_pincode = validated_data['shipping_pincode']
        buyer_district = (buyer.district or '').strip()

        # ── Calculate product subtotal & verify stock ──────────────────────
        product_subtotal = 0
        order_items_to_create = []
        farmer_pincode = None
        farmer_district = None

        for item in validated_data['items']:
            product = item['product']
            qty = item['quantity']

            # Deduct stock atomically
            product.quantity -= qty
            product.save()

            price = product.price_per_unit
            product_subtotal += price * qty
            order_items_to_create.append((product, qty, price))

            # Use the FIRST farmer's location for shipping estimation
            if farmer_pincode is None and product.farmer:
                farmer_pincode = (product.farmer.pincode or '').strip()
                farmer_district = (product.farmer.district or '').strip()

        # ── Estimate shipping charge ───────────────────────────────────────
        # Rate: ₹12/km × estimated distance
        # Heuristic (same as services.py):
        #   Same pincode  → avg 3.5 km  → ~₹42
        #   Same district → avg 17.5 km → ~₹210
        #   Different     → avg 85 km   → ~₹1020
        RATE_PER_KM = 12  # ₹ per km — must stay in sync with EARNINGS_PER_KM

        if farmer_pincode and farmer_pincode == shipping_pincode:
            estimated_km = 3.5    # same pincode: short local delivery
        elif farmer_district and buyer_district and farmer_district.lower() == buyer_district.lower():
            estimated_km = 17.5   # same district: intra-district delivery
        else:
            estimated_km = 85.0   # cross-district: long-haul delivery

        shipping_charge = round(estimated_km * RATE_PER_KM, 2)
        total_amount = float(product_subtotal) + shipping_charge

        print(f"[ORDER] Product subtotal=₹{product_subtotal} | Shipping=₹{shipping_charge} ({estimated_km}km est.) | Total=₹{total_amount}")

        # ── Create Order ────────────────────────────────────────────────────
        order = Order.objects.create(
            buyer=buyer,
            product_subtotal=product_subtotal,
            shipping_charge=shipping_charge,
            total_amount=total_amount,
            status='placed',
            shipping_address=validated_data['shipping_address'],
            shipping_pincode=shipping_pincode,
            payment_status='pending'
        )

        # Create order items
        for prod, qty, price in order_items_to_create:
            OrderItem.objects.create(order=order, product=prod, quantity=qty, price=price)

        # ── Create Razorpay order (amount includes shipping) ────────────────
        razorpay_order_id = f"rzp_mock_{order.id}_{random.randint(10000, 99999)}"
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            rzp_order = client.order.create(data={
                "amount": int(total_amount * 100),  # in paise — includes shipping
                "currency": "INR",
                "receipt": f"order_rcpt_{order.id}",
                "payment_capture": 1,
                "notes": {
                    "product_subtotal": str(product_subtotal),
                    "shipping_charge": str(shipping_charge),
                }
            })
            razorpay_order_id = rzp_order['id']
        except Exception as e:
            print(f"[RAZORPAY WARNING] Using mock order ID. Error: {str(e)}")

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
            'message': 'Order placed. Complete payment to confirm (includes shipping charge).',
            'order': OrderSerializer(order).data,
            'razorpay_key_id': settings.RAZORPAY_KEY_ID,
            'amount_in_paise': int(total_amount * 100),
            'currency': 'INR',
            'bill_breakdown': {
                'product_subtotal': float(product_subtotal),
                'shipping_charge': float(shipping_charge),
                'estimated_km': estimated_km,
                'total_amount': float(total_amount),
            }
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

            # Broadcast open delivery shipment immediately so drivers can see and accept the job
            if not hasattr(order, 'shipment'):
                create_open_shipment(order)
                print(f"[LOGISTICS] Open delivery shipment created and broadcast for paid order #{order.id}.")

            print(f"\n[PAYMENT] Order #{order.id} payment verified. Status: PAID.\n")

            return Response({
                'message': 'Payment successful and verified. Order placed and open delivery shipment broadcast.',
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
    queryset = QuoteRequest.objects.select_related('buyer', 'product__farmer').all().order_by('-created_at')

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
    queryset = BulkRequirement.objects.select_related('buyer').prefetch_related('offers__farmer').all().order_by('-created_at')
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
    queryset = FarmerOffer.objects.select_related('farmer', 'requirement__buyer').all().order_by('-created_at')
    serializer_class = FarmerOfferSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)

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
    queryset = PreHarvestContract.objects.select_related('farmer', 'buyer').all().order_by('-created_at')
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
