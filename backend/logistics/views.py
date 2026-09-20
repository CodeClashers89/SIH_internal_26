from rest_framework import viewsets, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.db.models import Q, Sum
from django.db import transaction, OperationalError
from django.db.utils import DatabaseError
from django.utils import timezone
from decimal import Decimal
from .models import LogisticsPartner, DeliveryShipment, TransportOffer
from .serializers import LogisticsPartnerSerializer, DeliveryShipmentSerializer, TransportOfferSerializer
from .email_service import send_delivery_otp_email
from control_tower.models import OperationalEvent
from users.permissions import IsAdmin

# Earnings rate per km (in INR)
EARNINGS_PER_KM = Decimal('12.00')


def partner_operates_both_areas(partner, shipment):
    origin_terms = {
        str(value).strip().lower()
        for value in [
            partner.district,
            partner.pincode,
            partner.user.district if partner.user else None,
            partner.user.pincode if partner.user else None,
        ]
        if value
    }
    destination_terms = {
        term.strip().lower()
        for value in [
            partner.district,
            partner.pincode,
            partner.user.district if partner.user else None,
            partner.user.pincode if partner.user else None,
            partner.user.service_area if partner.user else None,
        ]
        if value
        for term in str(value).replace(';', ',').split(',')
        if term.strip()
    }
    pickup = (shipment.pickup_address or '').lower()
    drop = (shipment.delivery_address or '').lower()
    pickup_matches = any(term in pickup for term in origin_terms)
    drop_matches = any(term in drop for term in destination_terms)
    has_service_corridor = bool((partner.user.service_area if partner.user else '').strip())
    return pickup_matches and (drop_matches or has_service_corridor)


class LogisticsPartnerViewSet(viewsets.ModelViewSet):
    queryset = LogisticsPartner.objects.all()
    serializer_class = LogisticsPartnerSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsAdmin()]

    def get_queryset(self):
        queryset = super().get_queryset().filter(active=True)
        shipment_id = self.request.query_params.get('shipment')
        if shipment_id:
            try:
                shipment = DeliveryShipment.objects.get(pk=shipment_id)
            except DeliveryShipment.DoesNotExist:
                return queryset.none()
            rejected_partner_ids = TransportOffer.objects.filter(
                shipment=shipment,
                status='rejected',
            ).values_list('partner_id', flat=True)
            queryset = queryset.exclude(id__in=rejected_partner_ids)
            queryset = [partner for partner in queryset if partner_operates_both_areas(partner, shipment)]
        return queryset


class DeliveryShipmentViewSet(viewsets.ModelViewSet):
    queryset = DeliveryShipment.objects.select_related('partner', 'order', 'order__buyer').prefetch_related('order__items__product__farmer').all().order_by('-assigned_at')
    serializer_class = DeliveryShipmentSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if user.role == 'admin':
            return queryset

        elif user.role == 'farmer':
            return queryset.filter(order__items__product__farmer=user).distinct()

        elif user.role == 'logistics_partner':
            # Rapido-style: Every driver sees:
            #   1. OPEN jobs (partner=null AND not delivered) — available to accept
            #   2. Their own accepted/active/completed jobs
            partner = getattr(user, 'logistics_profile', None)

            # A pending farmer offer makes the shipment private to that driver.
            pending_offer_shipments = TransportOffer.objects.filter(status='pending').values('shipment_id')
            open_jobs = Q(partner__isnull=True) & ~Q(status='delivered') & ~Q(id__in=pending_offer_shipments)

            if partner:
                selected_offer_jobs = Q(transport_offers__partner=partner, transport_offers__status='pending')
                return queryset.filter(
                    open_jobs |               # open broadcast jobs
                    selected_offer_jobs |     # private offer for this driver
                    Q(partner=partner)         # this driver's own jobs (including completed)
                ).distinct()
            else:
                # Driver has no profile yet — still show open jobs so they can accept
                return queryset.filter(open_jobs)

        else:
            # Consumer/Buyer sees their own orders' shipments
            return queryset.filter(order__buyer=user)

    @action(detail=True, methods=['post'], url_path='accept-job')
    @transaction.atomic
    def accept_job(self, request, pk=None):
        """
        Rapido-style atomic accept — SQLite-safe:

        1. Acquire a row-level lock via select_for_update().
           On SQLite this serialises concurrent requests (one waits, one proceeds).
           nowait=True is NOT used because SQLite raises OperationalError instead
           of waiting — we prefer serialised access so both drivers get a clean answer.

        2. After acquiring the lock, RE-CHECK partner/status inside the same
           transaction. If another driver just committed their accept, we see it
           immediately and return 409 — no double-booking possible.

        3. Only then do we write the claim. The transaction commits when the
           view returns, releasing the lock.
        """
        user = request.user
        if user.role != 'logistics_partner':
            return Response(
                {'error': 'Only logistics partner accounts can accept delivery jobs.'},
                status=status.HTTP_403_FORBIDDEN
            )

        partner = getattr(user, 'logistics_profile', None)
        pending_offer = TransportOffer.objects.filter(
            shipment_id=pk,
            partner=partner,
            status='pending',
        ).exists() if partner else False

        # ── Step 1: Acquire row lock (blocks concurrent requests on same row) ──
        try:
            # select_for_update() without nowait: serialises — second caller waits
            # until first transaction commits, then re-reads the updated row.
            shipment = DeliveryShipment.objects.select_for_update().get(pk=pk)
        except DeliveryShipment.DoesNotExist:
            return Response({'error': 'Shipment not found.'}, status=status.HTTP_404_NOT_FOUND)
        except (OperationalError, DatabaseError) as e:
            # Database locked (SQLite) or generic DB error
            print(f"[LOGISTICS] DB lock error on accept_job: {e}")
            return Response(
                {'error': 'Server busy — please try again in a moment.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # ── Step 2: Re-check state AFTER acquiring lock ───────────────────────
        # This is the critical section. If driver B acquires the lock after
        # driver A committed, they'll see shipment.partner already set.

        if shipment.status == 'delivered':
            return Response(
                {'error': 'This order has already been delivered and cannot be accepted.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if shipment.status == 'picked_up':
            return Response(
                {'error': 'This shipment is already picked up by another driver.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if shipment.partner is not None and shipment.partner.user is not None:
            if shipment.partner.user == user:
                # Idempotent — this driver already accepted it
                return Response(
                    DeliveryShipmentSerializer(shipment).data,
                    status=status.HTTP_200_OK
                )
            # Another real driver beat us to it
            return Response(
                {'error': f'⚡ Just taken! Another driver accepted this job a moment ago.'},
                status=status.HTTP_409_CONFLICT
            )

        if TransportOffer.objects.filter(shipment=shipment, status='pending').exists() and not pending_offer:
            return Response(
                {'error': 'This shipment has been privately offered to another driver.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # ── Step 3: Claim the shipment ────────────────────────────────────────
        partner, created = LogisticsPartner.objects.get_or_create(
            user=user,
            defaults={
                'name': user.first_name or user.username,
                'pincode': user.pincode or '000000',
                'district': user.district or 'Unknown',
                'phone': user.phone or '0000000000',
                'active': True,
            }
        )

        shipment.partner = partner
        shipment.status = 'assigned'
        shipment.save()  # commits on transaction exit — lock releases here

        # Send delivery OTP email to consumer upon driver assignment
        email_sent, email_info = send_delivery_otp_email(shipment)

        print(f"[LOGISTICS] Driver '{user.username}' (partner #{partner.id}) accepted shipment #{shipment.id} for order #{shipment.order_id}. OTP Email: {email_info}")
        return Response(DeliveryShipmentSerializer(shipment).data, status=status.HTTP_200_OK)


    @action(detail=True, methods=['post'], url_path='confirm-handover')
    @transaction.atomic
    def confirm_handover(self, request, pk=None):
        shipment = self.get_object()
        user = request.user
        
        # Verify permissions: For example, an FPO operator or the assigned driver
        # Simplified: any authenticated user involved in operations can confirm for now
        # You can tighten this based on actual roles
        
        if shipment.status not in ['assigned']:
            return Response(
                {'error': 'Handover can only be confirmed for shipments currently assigned and not yet picked up or delivered.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        shipment.status = 'handover_completed'
        shipment.handover_completed_at = timezone.now()
        shipment.handover_confirmed_by = user
        shipment.save()
        
        order = shipment.order
        order.status = 'in_transit'
        order.cancellation_locked = True
        order.cancellation_locked_at = timezone.now()
        order.save()
        
        # Emit event to Control Tower
        OperationalEvent.objects.create(
            event_type='TRANSPORT_HANDOVER_COMPLETED',
            entity_type='DeliveryShipment',
            entity_id=str(shipment.id),
            actor_id=str(user.id),
            metadata={
                'order_id': order.id,
                'logistics_partner': shipment.partner.name if shipment.partner else 'Unassigned'
            },
            description=f"Physical handover confirmed by {user.username}. Cancellation locked."
        )
        
        return Response({
            'message': 'Transport handover confirmed. Order cancellation is now locked.',
            'shipment': DeliveryShipmentSerializer(shipment).data
        })

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_delivery_status(self, request, pk=None):
        shipment = self.get_object()
        user = request.user
        new_status = request.data.get('status')

        if user.role != 'logistics_partner':
            return Response(
                {'error': 'Only logistics partners can update delivery status.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Must be the assigned driver
        partner = getattr(user, 'logistics_profile', None)
        if not partner or shipment.partner != partner:
            return Response(
                {'error': 'You are not the assigned driver for this shipment.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if new_status not in ['picked_up']:
            return Response(
                {'error': 'Invalid status. Use picked_up. For delivery use verify-otp endpoint.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_status == 'delivered':
            return Response(
                {'error': 'Use the verify-otp endpoint to mark delivery completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        shipment.status = 'picked_up'
        shipment.shipped_at = timezone.now()
        shipment.save()

        # Update order status to in_transit
        order = shipment.order
        order.status = 'in_transit'
        order.save()

        # Automatically email the delivery OTP to the consumer
        email_sent, email_info = send_delivery_otp_email(shipment)

        print(f"[LOGISTICS] Driver '{user.username}' picked up shipment #{shipment.id} → Order #{order.id} is now IN_TRANSIT. OTP Email: {email_info}")
        
        response_data = DeliveryShipmentSerializer(shipment).data
        return Response({
            **response_data,
            'email_notification': f"Delivery OTP sent to {email_info}" if email_sent else f"Email status: {email_info}"
        })

    @action(detail=True, methods=['post'], url_path='send-otp-email')
    def send_otp_email(self, request, pk=None):
        """Allows driver or buyer to request/resend the delivery OTP to the consumer email."""
        shipment = self.get_object()
        email_sent, email_info = send_delivery_otp_email(shipment)
        if email_sent:
            return Response({'message': f'✅ Delivery OTP successfully emailed to {email_info}'})
        else:
            return Response({'error': f'Failed to send email: {email_info}'}, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=True, methods=['post'], url_path='verify-otp')
    @transaction.atomic
    def verify_otp(self, request, pk=None):
        """Verify buyer's OTP to confirm delivery. Marks order as delivered."""
        shipment = self.get_object()
        user = request.user
        otp = request.data.get('otp')

        if not otp:
            return Response({'error': 'OTP is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if shipment.status != 'picked_up':
            return Response(
                {'error': 'Package must be in picked_up/in-transit state before verifying delivery.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify driver is assigned
        partner = getattr(user, 'logistics_profile', None)
        if not partner or shipment.partner != partner:
            return Response(
                {'error': 'You are not the assigned driver for this shipment.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check that the consumer has paid for the order and transportation charge
        order = shipment.order
        if order.payment_status != 'paid':
            return Response(
                {
                    'error': f'Cannot complete delivery: Order & Transportation charge of ₹{order.total_amount} is pending payment. Consumer must complete payment before delivery confirmation.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Strict OTP check — must match the exact 6-digit OTP sent to consumer's email
        submitted_otp = str(otp).strip()
        expected_otp = str(shipment.delivery_otp).strip()
        if submitted_otp != expected_otp:
            return Response(
                {'error': 'Invalid OTP. Please enter the correct 6-digit verification code from the consumer\'s email.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        shipment.status = 'delivered'
        shipment.delivered_at = timezone.now()
        shipment.save()

        order = shipment.order
        order.status = 'delivered'
        order.save()

        print(f"[LOGISTICS] OTP verified for order #{order.id} by driver '{user.username}'. DELIVERED.")
        return Response({
            'message': '✅ OTP verified! Order successfully delivered.',
            'shipment': DeliveryShipmentSerializer(shipment).data
        })


class TransportOfferViewSet(viewsets.ModelViewSet):
    queryset = TransportOffer.objects.select_related('shipment', 'partner', 'farmer').all().order_by('-created_at')
    serializer_class = TransportOfferSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == 'farmer':
            return queryset.filter(farmer=user)
        if user.role == 'logistics_partner':
            return queryset.filter(partner__user=user)
        return queryset.none()

    def create(self, request, *args, **kwargs):
        user = request.user
        if user.role != 'farmer':
            return Response({'error': 'Only farmers can offer a ride to a driver.'}, status=status.HTTP_403_FORBIDDEN)

        shipment_id = request.data.get('shipment')
        partner_id = request.data.get('partner')
        msg = request.data.get('message', 'Please accept this delivery ride offer for my order.')

        if not shipment_id or not partner_id:
            return Response({'error': 'Both shipment and partner are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            shipment = DeliveryShipment.objects.get(pk=shipment_id)
        except DeliveryShipment.DoesNotExist:
            return Response({'error': 'Shipment not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            partner = LogisticsPartner.objects.get(pk=partner_id)
        except LogisticsPartner.DoesNotExist:
            return Response({'error': 'Logistics partner not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not shipment.order.items.filter(product__farmer=user).exists():
            return Response({'error': 'You can only assign transport for your own shipment.'}, status=status.HTTP_403_FORBIDDEN)

        if not partner.active:
            return Response({'error': 'This transport partner is not active.'}, status=status.HTTP_400_BAD_REQUEST)

        if not partner_operates_both_areas(partner, shipment):
            return Response({'error': 'This driver does not operate in both the pickup and delivery areas.'}, status=status.HTTP_400_BAD_REQUEST)

        if shipment.partner_id:
            return Response({'error': 'This shipment already has an assigned transport partner.'}, status=status.HTTP_400_BAD_REQUEST)

        offer, created = TransportOffer.objects.update_or_create(
            shipment=shipment,
            partner=partner,
            defaults={
                'farmer': user,
                'status': 'pending',
                'message': msg,
            }
        )

        serializer = self.get_serializer(offer)
        res_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=res_status)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def respond(self, request, pk=None):
        offer = self.get_object()
        if request.user.role != 'logistics_partner' or offer.partner.user_id != request.user.id:
            return Response({'error': 'Only the selected driver can respond to this offer.'}, status=status.HTTP_403_FORBIDDEN)
        if offer.status != 'pending':
            return Response({'error': 'This transport offer has already been answered.'}, status=status.HTTP_400_BAD_REQUEST)

        accept = request.data.get('accept') is True
        offer.status = 'accepted' if accept else 'rejected'
        offer.save(update_fields=['status', 'updated_at'])
        if accept:
            shipment = DeliveryShipment.objects.select_for_update().get(pk=offer.shipment_id)
            if shipment.partner_id:
                offer.status = 'rejected'
                offer.save(update_fields=['status', 'updated_at'])
                return Response({'error': 'Another driver has already been assigned.'}, status=status.HTTP_409_CONFLICT)
            shipment.partner = offer.partner
            shipment.status = 'assigned'
            shipment.save(update_fields=['partner', 'status'])
            TransportOffer.objects.filter(shipment=shipment, status='pending').exclude(pk=offer.pk).update(status='rejected')
        return Response(TransportOfferSerializer(offer).data)


class LogisticsStatsView(APIView):
    """Earnings summary and delivery stats for the authenticated logistics partner."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != 'logistics_partner':
            return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        partner = getattr(user, 'logistics_profile', None)
        if not partner:
            return Response({
                'total_earnings': 0,
                'completed_deliveries': 0,
                'active_deliveries': 0,
                'total_km_driven': 0,
                'pending_jobs': 0,
                'earnings_per_km': float(EARNINGS_PER_KM),
            })

        shipments = DeliveryShipment.objects.filter(partner=partner)
        completed = shipments.filter(status='delivered')
        active = shipments.filter(status__in=['assigned', 'picked_up'])
        open_jobs = DeliveryShipment.objects.filter(partner__isnull=True)

        total_km = completed.aggregate(total=Sum('distance_km'))['total'] or Decimal('0')
        total_earnings = total_km * EARNINGS_PER_KM

        return Response({
            'total_earnings': float(round(total_earnings, 2)),
            'completed_deliveries': completed.count(),
            'active_deliveries': active.count(),
            'total_km_driven': float(round(total_km, 2)),
            'pending_jobs': open_jobs.count(),
            'earnings_per_km': float(EARNINGS_PER_KM),
        })


class LogisticsVehicleUpdateView(APIView):
    """Allows a logistics partner to update their vehicle details and service area."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        user = request.user
        if user.role != 'logistics_partner':
            return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        allowed_fields = ['vehicle_number', 'vehicle_type', 'capacity', 'service_area', 'district', 'pincode', 'address']
        for field in allowed_fields:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()

        # Sync LogisticsPartner profile
        partner = getattr(user, 'logistics_profile', None)
        if partner:
            if 'district' in request.data:
                partner.district = request.data['district']
            if 'pincode' in request.data:
                partner.pincode = request.data['pincode']
            if 'vehicle_number' in request.data or 'vehicle_type' in request.data:
                partner.name = f"{user.first_name or user.username} ({user.vehicle_type or 'Driver'})"
            partner.save()

        from users.serializers import UserSerializer
        return Response({
            'message': 'Vehicle profile updated successfully.',
            'user': UserSerializer(user).data
        })
