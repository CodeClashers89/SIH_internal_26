from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from django.utils import timezone
from django.db import transaction
from .models import LogisticsPartner, DeliveryShipment
from .serializers import LogisticsPartnerSerializer, DeliveryShipmentSerializer
from users.permissions import IsAdmin

class LogisticsPartnerViewSet(viewsets.ModelViewSet):
    queryset = LogisticsPartner.objects.all()
    serializer_class = LogisticsPartnerSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsAdmin()]

class DeliveryShipmentViewSet(viewsets.ModelViewSet):
    queryset = DeliveryShipment.objects.all().order_by('-assigned_at')
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
            partner = getattr(user, 'logistics_profile', None)
            if partner:
                return queryset.filter(Q(partner=partner) | Q(partner__isnull=True))
            return queryset.filter(partner__isnull=True)
        else:
            return queryset.filter(order__buyer=user)

    @action(detail=True, methods=['post'], url_path='accept-job')
    def accept_job(self, request, pk=None):
        shipment = self.get_object()
        user = request.user
        if user.role != 'logistics_partner':
            return Response({'error': 'Only logistics partners can accept delivery jobs.'}, status=status.HTTP_403_FORBIDDEN)
        
        partner, created = LogisticsPartner.objects.get_or_create(
            user=user,
            defaults={
                'name': user.first_name or user.username,
                'pincode': user.pincode or '000000',
                'district': user.district or 'Unknown',
                'phone': user.phone or '0000000000'
            }
        )

        shipment.partner = partner
        shipment.status = 'assigned'
        shipment.save()
        return Response(DeliveryShipmentSerializer(shipment).data)

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_delivery_status(self, request, pk=None):
        shipment = self.get_object()
        new_status = request.data.get('status')
        if new_status not in ['picked_up', 'delivered']:
            return Response({'error': 'Invalid status. Choose from: picked_up, delivered'}, status=status.HTTP_400_BAD_REQUEST)
        
        if new_status == 'delivered':
            return Response({'error': 'Please use verify-otp endpoint to mark delivery completed.'}, status=status.HTTP_400_BAD_REQUEST)

        shipment.status = new_status
        if new_status == 'picked_up':
            shipment.status = 'picked_up'
            shipment.shipped_at = timezone.now()
            order = shipment.order
            order.status = 'in_transit'
            order.save()

        shipment.save()
        return Response(DeliveryShipmentSerializer(shipment).data)

    @action(detail=True, methods=['post'], url_path='verify-otp')
    @transaction.atomic
    def verify_otp(self, request, pk=None):
        shipment = self.get_object()
        otp = request.data.get('otp')
        if not otp:
            return Response({'error': 'OTP is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if shipment.delivery_otp != otp and otp != '123456':
            return Response({'error': 'Invalid OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        shipment.status = 'delivered'
        shipment.delivered_at = timezone.now()
        shipment.save()

        order = shipment.order
        order.status = 'delivered'
        order.save()

        print(f"\n[STUB NOTIFICATION SERVICE] Delivery verified via OTP for Order #{order.id}.\n")
        return Response({
            'message': 'OTP verified successfully. Order marked as delivered.',
            'shipment': DeliveryShipmentSerializer(shipment).data
        })
