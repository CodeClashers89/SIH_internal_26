from rest_framework import viewsets, permissions, views
from rest_framework.response import Response
from .models import ControlTowerException, OperationalEvent
from .serializers import ControlTowerExceptionSerializer
from .engine import ControlTowerEngine
from orders.models import Order
from logistics.models import DeliveryShipment, LogisticsPartner

class ControlTowerSummaryView(views.APIView):
    permission_classes = [permissions.AllowAny] # For demo purposes

    def get(self, request):
        # Run engine to ensure exceptions are up to date
        ControlTowerEngine.run_checks()

        active_orders = Order.objects.exclude(status__in=['delivered', 'cancelled']).count()
        delayed_orders = ControlTowerException.objects.filter(status='open', type='DELIVERY_DELAY').count()
        orders_at_risk = ControlTowerException.objects.filter(status='open', entity_type='Order').count()
        
        quality_disputes = 0 # Placeholder if Quality module is missing
        vehicle_issues = ControlTowerException.objects.filter(status='open', type='VEHICLE_UNAVAILABLE').count()
        payment_disputes = ControlTowerException.objects.filter(status='open', type='PAYMENT_DISPUTE').count()

        produce_in_transit_qty = 0 # Calculate from active shipments
        
        pending_handovers = DeliveryShipment.objects.filter(status='assigned').count()
        completed_handovers = DeliveryShipment.objects.filter(status='handover_completed').count()
        
        available_trucks = LogisticsPartner.objects.filter(active=True).count()
        
        critical_exceptions = ControlTowerException.objects.filter(status='open', severity='CRITICAL').count()

        return Response({
            "active_orders": active_orders,
            "orders_at_risk": orders_at_risk,
            "delayed_orders": delayed_orders,
            "quality_disputes": quality_disputes,
            "vehicle_issues": vehicle_issues,
            "payment_disputes": payment_disputes,
            "produce_in_transit_qty": produce_in_transit_qty,
            "available_trucks": available_trucks,
            "pending_handovers": pending_handovers,
            "completed_handovers": completed_handovers,
            "critical_exceptions": critical_exceptions
        })

class ControlTowerExceptionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ControlTowerException.objects.filter(status='open').order_by('severity', '-created_at')
    serializer_class = ControlTowerExceptionSerializer
    permission_classes = [permissions.AllowAny]
